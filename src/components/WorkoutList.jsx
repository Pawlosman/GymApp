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
  const [syncCount, setSyncCount] = useState(0)

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

  // Push changes made offline as soon as the app starts online
  useEffect(() => {
    if (user) syncOfflineData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile])

  useEffect(() => {
    if (!user) return
    fetchWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate, profile, selectedTraining, syncCount])

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

  function getPendingDeleteKey() {
    return `pending_delete_${profile}_${user?.id}`
  }

  // Remember a record deleted offline so it is removed from the database later
  function queueDelete(id) {
    const key = getPendingDeleteKey()
    const ids = JSON.parse(localStorage.getItem(key) || '[]')
    if (!ids.includes(id)) localStorage.setItem(key, JSON.stringify([...ids, id]))
    setPendingSync(true)
  }

  async function syncOfflineData() {
    if (!user || !navigator.onLine) return
    let changed = false

    const deleteKey = getPendingDeleteKey()
    const idsToDelete = JSON.parse(localStorage.getItem(deleteKey) || '[]')
    if (idsToDelete.length > 0) {
      try {
        const { error } = await supabase.from('workouts').delete().in('id', idsToDelete)
        if (error) console.error('Sync delete error:', error)
        else { localStorage.removeItem(deleteKey); changed = true }
      } catch (e) {
        console.error('Failed to sync deletes:', e)
      }
    }

    const pendingKey = `pending_sync_${profile}_${user.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
    const failed = []

    for (const key of pending) {
      const [date, training] = key.split('::')
      const trainingTag = training ? `_${training.replace(/\s+/g, '_')}` : ''
      const localKey = `workouts_${profile}_${user.id}_${date}${trainingTag}`
      const localData = localStorage.getItem(localKey)
      if (!localData) continue
      let ok = true
      const synced = []
      for (const workout of JSON.parse(localData)) {
        try {
          if (String(workout.id).startsWith('temp_')) {
            // Created offline: insert without the temporary id
            const { id, ...row } = workout
            const { data, error } = await supabase.from('workouts')
              .insert([{ ...row, user_id: user.id, date }]).select()
            if (error || !data?.[0]) { ok = false; synced.push(workout); if (error) console.error('Sync insert error:', error) }
            else synced.push(data[0])
          } else {
            const { error } = await supabase.from('workouts')
              .update({ set_records: workout.set_records }).eq('id', workout.id)
            if (error) { ok = false; console.error('Sync update error:', error) }
            synced.push(workout)
          }
        } catch (e) {
          ok = false
          synced.push(workout)
          console.error('Failed to sync:', e)
        }
      }
      localStorage.setItem(localKey, JSON.stringify(synced))
      if (ok) changed = true
      else failed.push(key)
    }

    if (failed.length > 0) localStorage.setItem(pendingKey, JSON.stringify(failed))
    else localStorage.removeItem(pendingKey)
    if (changed || pending.length > 0) setSyncCount(c => c + 1)
  }

  async function fetchWorkouts() {
    if (!user) return

    const pendingKey = `pending_sync_${profile}_${user.id}`
    const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]')
    const key = isTomek && selectedTraining ? `${selectedDate}::${selectedTraining}` : selectedDate
    const hasPendingChanges = pending.includes(key)
    const hasPendingDeletes = JSON.parse(localStorage.getItem(getPendingDeleteKey()) || '[]').length > 0
    setPendingSync(hasPendingChanges || hasPendingDeletes)

    const localData = loadFromLocalStorage()
    if (localData) setWorkouts(localData)

    // Unsynced local changes win over the server copy until they are synced
    if (navigator.onLine && !(hasPendingChanges && localData)) {
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
        .limit(500)

      if (isTomek) {
        query = query.eq('profile', 'tomek')
        if (selectedTraining) query = query.eq('training_name', selectedTraining)
      } else {
        query = query.eq('profile', 'tata')
      }

      const { data, error } = await query
      if (!error && data) {
        // PRO: suggest results from the same weekday (previous Saturday for a Saturday, etc.)
        const weekday = getWeekdayName(selectedDate)
        setLastWorkouts(isTomek ? data : data.filter(w => getWeekdayName(w.date) === weekday))
      }
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
      persistSetRecords(myRecord, reindexed)
    }
    setSetsCounts(prev => ({ ...prev, [exerciseName]: Math.max(1, (prev[exerciseName] || 1) - 1) }))
  }

  // Saves the exercise's set records; when no sets are left the whole record is deleted,
  // so an exercise cleared by mistake doesn't count as done
  function persistSetRecords(myRecord, setRecords) {
    const isEmpty = Object.keys(setRecords).length === 0
    const updatedWorkouts = isEmpty
      ? workouts.filter(w => w.exercise_name !== myRecord.exercise_name)
      : workouts.map(w => w.exercise_name === myRecord.exercise_name ? { ...w, set_records: setRecords } : w)
    setWorkouts(updatedWorkouts)
    saveToLocalStorage(updatedWorkouts)
    if (String(myRecord.id).startsWith('temp_')) return
    // Offline (or on failure) the change stays cached: updates via the pending list, deletes via the delete queue
    if (!navigator.onLine) {
      if (isEmpty) queueDelete(myRecord.id)
      return
    }
    const request = isEmpty
      ? supabase.from('workouts').delete().eq('id', myRecord.id)
      : supabase.from('workouts').update({ set_records: setRecords }).eq('id', myRecord.id)
    request.then(({ error }) => {
      if (!error) clearPendingSync()
      else {
        console.error('Failed to update set records:', error)
        if (isEmpty) queueDelete(myRecord.id)
      }
    }, () => { if (isEmpty) queueDelete(myRecord.id) })
  }

  // Clearing an input removes that value; a set with neither reps nor weight is removed
  function clearSetValue(exerciseName, setIndex, field) {
    const myRecord = workouts.find(w => w.exercise_name === exerciseName)
    const current = myRecord?.set_records?.[setIndex]
    if (!current || !current[field]) return
    const other = field === 'reps' ? 'weight' : 'reps'
    const updatedSetRecords = { ...myRecord.set_records }
    if (current[other]) updatedSetRecords[setIndex] = { ...current, [field]: 0 }
    else delete updatedSetRecords[setIndex]
    persistSetRecords(myRecord, updatedSetRecords)
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
    ? (!selectedTraining ? 'Select Training A or B from the sidebar' : 'No exercises found for this training')
    : `No training scheduled for ${weekday}`

  const profileDisplayName = profile === 'tata' ? 'PRO' : profile === 'tomek' ? 'LITE' : 'Sciatica'
  const trainingLabel = isTomek && selectedTraining
    ? selectedTraining.replace(/^Workout\s*/i, '')
    : null

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">{dateDisplay}</h2>
          <span className="badge bg-secondary mt-1 me-1" style={{ fontSize: '0.9rem' }}>{profileDisplayName}</span>
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

            // Most recent previous session in which this exercise was actually logged
            const lastRecord = lastWorkouts.find(w => w.exercise_name === exercise.name && Object.keys(w.set_records || {}).length > 0)
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
                      style={{ height: '200px', width: '100%', objectFit: 'contain' }}
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
                          // Same set from the previous session; extra sets fall back to its last set
                          const lastSet = lastSetRecords[setIndex] || lastFinalSet

                          return (
                            <tr key={setIndex}>
                              <td><strong>{setIndex + 1}</strong></td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder={lastSet.reps ? `${lastSet.reps}` : 'Reps'}
                                  defaultValue={savedSet.reps || ''}
                                  style={hasUserReps ? { fontWeight: 'bold', color: '#dc3545' } : {}}
                                  onBlur={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null
                                    if (value !== null) saveSetRecord(exercise.name, setIndex, value, savedSet.weight || 0)
                                    else clearSetValue(exercise.name, setIndex, 'reps')
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder={lastSet.weight ? `${lastSet.weight}` : 'Weight'}
                                  defaultValue={savedSet.weight || ''}
                                  style={hasUserWeight ? { fontWeight: 'bold', color: '#dc3545' } : {}}
                                  onBlur={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null
                                    if (value !== null) saveSetRecord(exercise.name, setIndex, savedSet.reps || 0, value)
                                    else clearSetValue(exercise.name, setIndex, 'weight')
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
