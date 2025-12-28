import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import trainingsData from '../../data/trainings.json'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NUMBERS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isoDate(date) {
  // Use local date, not UTC
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekdayName(isoDateStr) {
  const [year, month, day] = isoDateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return WEEKDAY_NAMES[date.getDay()]
}

function formatDateDisplay(isoDateStr) {
  const [year, month, day] = isoDateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const dayName = DAY_NUMBERS[date.getDay()]
  return `${dayName} ${day}/${month}/${year}`
}

function getTrainingForMonth(monthIndex) {
  const monthName = MONTH_NAMES[monthIndex]
  for (const [trainingName, training] of Object.entries(trainingsData.trainings)) {
    const months = (training.months || []).map(m => String(m).trim())
    if (months.includes(monthName)) {
      return { trainingName, training }
    }
  }
  return null
}

export default function WorkoutList({ user, selectedDate: externalSelectedDate }) {
  // Auto-detect today's date
  const todayDate = isoDate(new Date())
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const [workouts, setWorkouts] = useState([])
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [setsCounts, setSetsCounts] = useState({})
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineData()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (externalSelectedDate) setSelectedDate(externalSelectedDate)
  }, [externalSelectedDate])

  useEffect(() => {
    if (!user) return
    fetchWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate])

  // Load from localStorage
  function getLocalStorageKey() {
    return `workouts_${user?.id}_${selectedDate}`
  }

  function saveToLocalStorage(data, markPending = true) {
    try {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(data))
      // Mark as pending sync only if requested
      if (markPending) {
        const pendingKey = `pending_sync_${user?.id}`
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
        if (!pending.includes(selectedDate)) {
          pending.push(selectedDate)
          localStorage.setItem(pendingKey, JSON.stringify(pending))
        }
        setPendingSync(true)
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }

  function loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(getLocalStorageKey())
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error('Failed to load from localStorage:', e)
      return null
    }
  }

  async function syncOfflineData() {
    if (!user || !navigator.onLine) return

    const pendingKey = `pending_sync_${user.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')

    for (const date of pending) {
      const localKey = `workouts_${user.id}_${date}`
      const localData = localStorage.getItem(localKey)
      if (localData) {
        const workoutsToSync = JSON.parse(localData)
        for (const workout of workoutsToSync) {
          try {
            // Try to update if exists, otherwise insert
            const { error } = await supabase
              .from('workouts')
              .upsert({
                ...workout,
                user_id: user.id,
                date: date
              }, {
                onConflict: 'id'
              })
            if (error) console.error('Sync error:', error)
          } catch (e) {
            console.error('Failed to sync:', e)
          }
        }
      }
    }

    // Clear pending sync list
    localStorage.removeItem(pendingKey)
    setPendingSync(false)
    fetchWorkouts()
  }

  async function fetchWorkouts() {
    if (!user) return

    // Check if current date has pending sync
    const pendingKey = `pending_sync_${user.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
    setPendingSync(pending.includes(selectedDate))

    // Try to load from localStorage first
    const localData = loadFromLocalStorage()
    if (localData) {
      setWorkouts(localData)
    }

    // If online, fetch from Supabase
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', selectedDate)
          .order('id', { ascending: true })
        if (error) console.error(error)
        else {
          setWorkouts(data || [])
          // Save to localStorage for offline access (without marking as pending)
          saveToLocalStorage(data || [], false)
        }
      } catch (e) {
        console.error('Failed to fetch from Supabase:', e)
        // Use local data if available
        if (localData) {
          setWorkouts(localData)
        }
      }
    }
  }

  // support several input formats for selectedDate (ISO or dd/mm/yyyy or mm/dd/yyyy)
  function parseSelectedDate(str) {
    if (!str) return new Date()
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [a, b, c] = str.split('/').map(Number)
      // prefer day/month/year (European) if ambiguous
      const day = a
      const month = b
      const year = c
      return new Date(year, month - 1, day)
    }
    // fallback to Date constructor
    const d = new Date(str)
    if (!isNaN(d)) return d
    return new Date()
  }

  const localDateObj = parseSelectedDate(selectedDate)
  const monthIndex = localDateObj.getMonth()
  const weekday = WEEKDAY_NAMES[localDateObj.getDay()]
  const dateDisplay = formatDateDisplay(selectedDate)
  const trainingInfo = getTrainingForMonth(monthIndex)
  const training = trainingInfo?.training
  let exerciseTemplate = []
  if (training) {
    // try exact match, then try short-name match (Tue -> Tuesday or vice-versa)
    if (training[weekday]) exerciseTemplate = training[weekday]
    else {
      const lower = weekday.toLowerCase()
      const foundKey = Object.keys(training).find(k => k.toLowerCase() === lower || k.toLowerCase().startsWith(lower.slice(0,3)))
      if (foundKey) exerciseTemplate = training[foundKey]
    }
  }

  // Initialize set counts from template
  useEffect(() => {
    const initialCounts = {}
    exerciseTemplate.forEach(ex => {
      initialCounts[ex.name] = ex.sets
    })
    setSetsCounts(initialCounts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, weekday])

  function addSet(exerciseName) {
    setSetsCounts(prev => ({
      ...prev,
      [exerciseName]: (prev[exerciseName] || 0) + 1
    }))
  }

  function removeSet(exerciseName, setIndex) {
    // Remove the specific set from the database
    const myRecord = workouts.find(w => w.exercise_name === exerciseName)
    if (myRecord?.set_records) {
      const updatedSetRecords = { ...myRecord.set_records }
      delete updatedSetRecords[setIndex]

      // Reindex remaining sets
      const reindexed = {}
      Object.keys(updatedSetRecords)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((oldIndex, newIndex) => {
          reindexed[newIndex] = updatedSetRecords[oldIndex]
        })

      // Update local state immediately
      const updatedWorkouts = workouts.map(w =>
        w.exercise_name === exerciseName
          ? { ...w, set_records: reindexed }
          : w
      )
      setWorkouts(updatedWorkouts)
      saveToLocalStorage(updatedWorkouts)

      // Update database if online
      if (navigator.onLine && !String(myRecord.id).startsWith('temp_')) {
        supabase
          .from('workouts')
          .update({ set_records: reindexed })
          .eq('id', myRecord.id)
          .then(({ error }) => {
            if (error) console.error(error)
            else clearPendingSync()
          })
      }
    }

    // Decrease the count
    setSetsCounts(prev => ({
      ...prev,
      [exerciseName]: Math.max(1, (prev[exerciseName] || 1) - 1)
    }))
  }

  function clearPendingSync() {
    const pendingKey = `pending_sync_${user?.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
    const updated = pending.filter(d => d !== selectedDate)
    if (updated.length > 0) {
      localStorage.setItem(pendingKey, JSON.stringify(updated))
    } else {
      localStorage.removeItem(pendingKey)
      setPendingSync(false)
    }
  }

  async function saveSetRecord(exerciseName, setIndex, reps, weight) {
    if (!user) return alert('Sign in first')

    // Find existing workout record
    let myRecord = workouts.find(w => w.exercise_name === exerciseName)
    const setRecordsData = myRecord?.set_records || {}
    setRecordsData[setIndex] = { reps, weight }

    // Update local state immediately
    const updatedWorkouts = myRecord
      ? workouts.map(w => w.exercise_name === exerciseName
          ? { ...w, set_records: setRecordsData }
          : w)
      : [...workouts, {
          id: `temp_${Date.now()}`,
          user_id: user.id,
          date: selectedDate,
          exercise_name: exerciseName,
          set_records: setRecordsData
        }]

    setWorkouts(updatedWorkouts)
    saveToLocalStorage(updatedWorkouts, true) // Mark as pending

    // If online, sync to Supabase in background (don't refetch)
    if (navigator.onLine) {
      try {
        if (myRecord && !String(myRecord.id).startsWith('temp_')) {
          const { error } = await supabase
            .from('workouts')
            .update({ set_records: setRecordsData })
            .eq('id', myRecord.id)
          if (!error) {
            clearPendingSync()
          }
        } else {
          const { data, error } = await supabase
            .from('workouts')
            .insert([{
              user_id: user.id,
              date: selectedDate,
              exercise_name: exerciseName,
              set_records: setRecordsData
            }])
            .select()

          // Update the temp ID with the real ID from database
          if (!error && data && data[0]) {
            const finalWorkouts = updatedWorkouts.map(w =>
              String(w.id).startsWith('temp_') && w.exercise_name === exerciseName
                ? { ...w, id: data[0].id }
                : w
            )
            setWorkouts(finalWorkouts)
            saveToLocalStorage(finalWorkouts, false)
            clearPendingSync()
          } else if (error) {
            console.error('Insert error:', error)
          }
        }
      } catch (e) {
        console.error('Failed to save online:', e)
      }
    }
  }

  async function deleteWorkout(id) {
    if (!user) return
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    if (error) console.error(error)
    else fetchWorkouts()
    setDeleteConfirm(null)
  }

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">{dateDisplay}</h2>
        <div>
          {!isOnline && (
            <span className="badge bg-warning text-dark me-2">
              ⚠ Offline Mode
            </span>
          )}
          {pendingSync && (
            <span className="badge bg-info text-dark">
              ⏳ Pending Sync
            </span>
          )}
          {isOnline && !pendingSync && (
            <span className="badge bg-success">
              ✓ Synced
            </span>
          )}
        </div>
      </div>

      {exerciseTemplate.length === 0 ? (
        <div className="alert alert-info">No training scheduled for {weekday}</div>
      ) : (
        <div className="row g-4">
          {exerciseTemplate.map((exercise) => {
            const myRecord = workouts.find(w => w.exercise_name === exercise.name)
            const mySetRecords = myRecord?.set_records || {}
            const currentSets = setsCounts[exercise.name] || exercise.sets

            return (
              <div key={exercise.name} className="col-md-6 col-lg-4">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="mb-0">{exercise.name}</h5>
                        <small>Target: {exercise.sets}x{exercise.reps}</small>
                      </div>
                      <button
                        className="btn btn-success"
                        onClick={() => addSet(exercise.name)}
                        title="Add set"
                        style={{ width: '32px', height: '32px', padding: '0', fontWeight: 'bold', fontSize: '20px', lineHeight: '1' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Set</th>
                          <th>Reps</th>
                          <th>Weight (kg)</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: currentSets }).map((_, setIndex) => {
                          const savedSet = mySetRecords[setIndex] || {}
                          return (
                            <tr key={setIndex}>
                              <td><strong>{setIndex + 1}</strong></td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder="Reps"
                                  defaultValue={savedSet.reps || ''}
                                  onBlur={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null
                                    if (value !== null) {
                                      saveSetRecord(exercise.name, setIndex, value, savedSet.weight || 0)
                                    }
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder="Weight"
                                  defaultValue={savedSet.weight || ''}
                                  onBlur={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null
                                    if (value !== null) {
                                      saveSetRecord(exercise.name, setIndex, savedSet.reps || 0, value)
                                    }
                                  }}
                                />
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeSet(exercise.name, setIndex)}
                                  title="Remove this set"
                                  style={{ padding: '2px 6px', fontSize: '14px' }}
                                >
                                  🗑
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Workout?</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteConfirm(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this workout record?</p>
                <p className="fw-bold mb-0">{deleteConfirm.exercise_name}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={() => deleteWorkout(deleteConfirm.id)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {workouts.length > 0 && (
        <div className="mt-4">
          <h4>Recorded Workouts</h4>
          <div className="list-group">
            {workouts.map((w) => (
              <div key={w.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-2">{w.exercise_name}</h6>
                  <small className="text-muted">
                    {w.sets}x{w.reps} @ {w.weight}kg
                  </small>
                </div>
                <button 
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setDeleteConfirm(w)}
                >
                  🗑 Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
