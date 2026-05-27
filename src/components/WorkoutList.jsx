import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import trainingsData from '../../data/trainings.json'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NUMBERS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function isoDate(date) {
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

export default function WorkoutList({ user, profile, selectedDate: externalSelectedDate, selectedTraining }) {
  const todayDate = isoDate(new Date())
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const [workouts, setWorkouts] = useState([])
  const [lastWorkouts, setLastWorkouts] = useState([])
  const [setsCounts, setSetsCounts] = useState({})
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(false)

  const isTomek = profile === 'tomek'

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineData() }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile])

  useEffect(() => {
    if (externalSelectedDate) setSelectedDate(externalSelectedDate)
  }, [externalSelectedDate])

  useEffect(() => {
    if (!user) return
    fetchWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate, profile, selectedTraining])

  function getLocalStorageKey() {
    const trainingTag = isTomek && selectedTraining ? `_${selectedTraining.replace(/\s+/g, '_')}` : ''
    return `workouts_${profile}_${user?.id}_${selectedDate}${trainingTag}`
  }

  function saveToLocalStorage(data, markPending = true) {
    try {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(data))
      if (markPending) {
        const pendingKey = `pending_sync_${profile}_${user?.id}`
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
        const key = isTomek && selectedTraining ? `${selectedDate}::${selectedTraining}` : selectedDate
        if (!pending.includes(key)) {
          pending.push(key)
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
      return null
    }
  }

  async function syncOfflineData() {
    if (!user || !navigator.onLine) return
    const pendingKey = `pending_sync_${profile}_${user.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')

    for (const key of pending) {
      const [date, training] = key.split('::')
      const trainingTag = training ? `_${training.replace(/\s+/g, '_')}` : ''
      const localKey = `workouts_${profile}_${user.id}_${date}${trainingTag}`
      const localData = localStorage.getItem(localKey)
      if (localData) {
        const workoutsToSync = JSON.parse(localData)
        for (const workout of workoutsToSync) {
          try {
            const { error } = await supabase.from('workouts').upsert(
              { ...workout, user_id: user.id, date },
              { onConflict: 'id' }
            )
            if (error) console.error('Sync error:', error)
          } catch (e) {
            console.error('Failed to sync:', e)
          }
        }
      }
    }

    localStorage.removeItem(pendingKey)
    setPendingSync(false)
    fetchWorkouts()
  }

  async function fetchWorkouts() {
    if (!user) return

    const pendingKey = `pending_sync_${profile}_${user.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
    const key = isTomek && selectedTraining ? `${selectedDate}::${selectedTraining}` : selectedDate
    setPendingSync(pending.includes(key))

    const localData = loadFromLocalStorage()
    if (localData) setWorkouts(localData)

    if (navigator.onLine) {
      try {
        let query = supabase.from('workouts').select('*')
          .eq('user_id', user.id)
          .eq('date', selectedDate)
          .order('id', { ascending: true })

        if (isTomek) {
          query = query.eq('profile', 'tomek')
          if (selectedTraining) query = query.eq('training_name', selectedTraining)
        } else {
          query = query.eq('profile', 'tata')
        }

        const { data, error } = await query
        if (error) console.error(error)
        else {
          setWorkouts(data || [])
          saveToLocalStorage(data || [], false)
        }
      } catch (e) {
        if (localData) setWorkouts(localData)
      }
    }

    fetchLastWorkouts()
  }

  async function fetchLastWorkouts() {
    if (!user || !navigator.onLine) return
    try {
      let query = supabase.from('workouts').select('*')
        .eq('user_id', user.id)
        .lt('date', selectedDate)
        .order('date', { ascending: false })
        .limit(50)

      if (isTomek) {
        query = query.eq('profile', 'tomek')
        if (selectedTraining) query = query.eq('training_name', selectedTraining)
      } else {
        query = query.eq('profile', 'tata')
      }

      const { data, error } = await query
      if (!error && data) setLastWorkouts(data)
    } catch (e) {
      console.error('Failed to fetch last workouts:', e)
    }
  }

  function parseSelectedDate(str) {
    if (!str) return new Date()
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number)
      return new Date(y, m - 1, d)
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [a, b, c] = str.split('/').map(Number)
      return new Date(c, b - 1, a)
    }
    const d = new Date(str)
    if (!isNaN(d)) return d
    return new Date()
  }

  const localDateObj = parseSelectedDate(selectedDate)
  const monthIndex = localDateObj.getMonth()
  const weekday = WEEKDAY_NAMES[localDateObj.getDay()]
  const dateDisplay = formatDateDisplay(selectedDate)

  let exerciseTemplate = []
  if (isTomek) {
    if (selectedTraining && trainingsData.tomekTrainings[selectedTraining]) {
      exerciseTemplate = trainingsData.tomekTrainings[selectedTraining].exercises
    }
  } else {
    const trainingInfo = getTrainingForMonth(monthIndex)
    const training = trainingInfo?.training
    if (training) {
      if (training[weekday]) exerciseTemplate = training[weekday]
      else {
        const lower = weekday.toLowerCase()
        const foundKey = Object.keys(training).find(k => k !== 'months' && (k.toLowerCase() === lower || k.toLowerCase().startsWith(lower.slice(0, 3))))
        if (foundKey) exerciseTemplate = training[foundKey]
      }
    }
  }

  useEffect(() => {
    const initialCounts = {}
    exerciseTemplate.forEach(ex => { initialCounts[ex.name] = ex.sets })
    setSetsCounts(initialCounts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, weekday, selectedTraining])

  function addSet(exerciseName) {
    setSetsCounts(prev => ({ ...prev, [exerciseName]: (prev[exerciseName] || 0) + 1 }))
  }

  function removeSet(exerciseName, setIndex) {
    const myRecord = workouts.find(w => w.exercise_name === exerciseName)
    if (myRecord?.set_records) {
      const updatedSetRecords = { ...myRecord.set_records }
      delete updatedSetRecords[setIndex]
      const reindexed = {}
      Object.keys(updatedSetRecords).map(Number).sort((a, b) => a - b).forEach((oldIndex, newIndex) => {
        reindexed[newIndex] = updatedSetRecords[oldIndex]
      })
      const updatedWorkouts = workouts.map(w =>
        w.exercise_name === exerciseName ? { ...w, set_records: reindexed } : w
      )
      setWorkouts(updatedWorkouts)
      saveToLocalStorage(updatedWorkouts)
      if (navigator.onLine && !String(myRecord.id).startsWith('temp_')) {
        supabase.from('workouts').update({ set_records: reindexed }).eq('id', myRecord.id)
          .then(({ error }) => { if (!error) clearPendingSync() })
      }
    }
    setSetsCounts(prev => ({ ...prev, [exerciseName]: Math.max(1, (prev[exerciseName] || 1) - 1) }))
  }

  function clearPendingSync() {
    const pendingKey = `pending_sync_${profile}_${user?.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
    const key = isTomek && selectedTraining ? `${selectedDate}::${selectedTraining}` : selectedDate
    const updated = pending.filter(d => d !== key)
    if (updated.length > 0) localStorage.setItem(pendingKey, JSON.stringify(updated))
    else localStorage.removeItem(pendingKey)
    setPendingSync(false)
  }

  async function saveSetRecord(exerciseName, setIndex, reps, weight) {
    if (!user) return alert('Sign in first')

    let myRecord = workouts.find(w => w.exercise_name === exerciseName)
    const setRecordsData = myRecord?.set_records || {}
    setRecordsData[setIndex] = { reps, weight }

    const newWorkoutBase = {
      id: `temp_${Date.now()}`,
      user_id: user.id,
      date: selectedDate,
      exercise_name: exerciseName,
      set_records: setRecordsData,
      profile: profile,
      ...(isTomek && selectedTraining ? { training_name: selectedTraining } : {})
    }

    const updatedWorkouts = myRecord
      ? workouts.map(w => w.exercise_name === exerciseName ? { ...w, set_records: setRecordsData } : w)
      : [...workouts, newWorkoutBase]

    setWorkouts(updatedWorkouts)
    saveToLocalStorage(updatedWorkouts, true)

    if (navigator.onLine) {
      try {
        if (myRecord && !String(myRecord.id).startsWith('temp_')) {
          const { error } = await supabase.from('workouts').update({ set_records: setRecordsData }).eq('id', myRecord.id)
          if (!error) clearPendingSync()
        } else {
          const insertData = {
            user_id: user.id,
            date: selectedDate,
            exercise_name: exerciseName,
            set_records: setRecordsData,
            profile: profile,
            ...(isTomek && selectedTraining ? { training_name: selectedTraining } : {})
          }
          const { data, error } = await supabase.from('workouts').insert([insertData]).select()
          if (!error && data && data[0]) {
            const finalWorkouts = updatedWorkouts.map(w =>
              String(w.id).startsWith('temp_') && w.exercise_name === exerciseName ? { ...w, id: data[0].id } : w
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

  const noTrainingMessage = isTomek
    ? 'Select a day and choose Training A or B from the sidebar'
    : `No training scheduled for ${weekday}`

  const trainingLabel = isTomek && selectedTraining
    ? selectedTraining.replace('Tomek ', '')
    : null

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">{dateDisplay}</h2>
          {trainingLabel && (
            <span className="badge bg-success mt-1" style={{ fontSize: '0.9rem' }}>{trainingLabel}</span>
          )}
        </div>
        <div>
          {!isOnline && <span className="badge bg-warning text-dark me-2">⚠ Offline Mode</span>}
          {pendingSync && <span className="badge bg-info text-dark">⏳ Pending Sync</span>}
          {isOnline && !pendingSync && <span className="badge bg-success">✓ Synced</span>}
        </div>
      </div>

      {exerciseTemplate.length === 0 ? (
        <div className="alert alert-info">{noTrainingMessage}</div>
      ) : (
        <div className="row g-4">
          {exerciseTemplate.map((exercise) => {
            const myRecord = workouts.find(w => w.exercise_name === exercise.name)
            const mySetRecords = myRecord?.set_records || {}
            const currentSets = setsCounts[exercise.name] || exercise.sets

            const lastRecord = lastWorkouts.find(w => w.exercise_name === exercise.name)
            const lastSetRecords = lastRecord?.set_records || {}
            const lastSetIndices = Object.keys(lastSetRecords).map(Number).sort((a, b) => b - a)
            const lastSetIndex = lastSetIndices.length > 0 ? lastSetIndices[0] : null
            const lastFinalSet = lastSetIndex !== null ? lastSetRecords[lastSetIndex] : {}

            return (
              <div key={exercise.name} className="col-md-6 col-lg-4">
                <div className="card">
                  {exercise.image && (
                    <img
                      src={`/exercises/${exercise.image}`}
                      alt={exercise.name}
                      className="card-img-top"
                      style={{ height: '200px', width: '100%', objectFit: 'contain', backgroundColor: '#f8f9fa' }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  <div className={`card-header text-white ${isTomek ? 'bg-success' : 'bg-primary'}`}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="mb-0">{exercise.name}</h5>
                        <small>Target: {exercise.sets}×{exercise.reps}</small>
                      </div>
                      <button
                        className="btn btn-light btn-sm"
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
                          const hasUserReps = savedSet.reps !== undefined && savedSet.reps !== null
                          const hasUserWeight = savedSet.weight !== undefined && savedSet.weight !== null

                          return (
                            <tr key={setIndex}>
                              <td><strong>{setIndex + 1}</strong></td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder={lastFinalSet.reps ? `${lastFinalSet.reps}` : 'Reps'}
                                  defaultValue={savedSet.reps || ''}
                                  style={hasUserReps ? { fontWeight: 'bold', color: '#dc3545' } : {}}
                                  onBlur={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null
                                    if (value !== null) saveSetRecord(exercise.name, setIndex, value, savedSet.weight || 0)
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder={lastFinalSet.weight ? `${lastFinalSet.weight}` : 'Weight'}
                                  defaultValue={savedSet.weight || ''}
                                  style={hasUserWeight ? { fontWeight: 'bold', color: '#dc3545' } : {}}
                                  onBlur={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null
                                    if (value !== null) saveSetRecord(exercise.name, setIndex, savedSet.reps || 0, value)
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
    </div>
  )
}
