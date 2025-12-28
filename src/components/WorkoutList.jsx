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
    if (training.months.includes(monthName)) {
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

  useEffect(() => {
    if (externalSelectedDate) setSelectedDate(externalSelectedDate)
  }, [externalSelectedDate])

  useEffect(() => {
    if (!user) return
    fetchWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate])

  async function fetchWorkouts() {
    if (!user) return
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .order('id', { ascending: true })
    if (error) console.error(error)
    else setWorkouts(data || [])
  }

  const [sy, sm, sd] = selectedDate.split('-').map(Number)
  const localDateObj = new Date(sy, sm - 1, sd)
  const monthIndex = localDateObj.getMonth()
  const weekday = WEEKDAY_NAMES[localDateObj.getDay()]
  const dateDisplay = formatDateDisplay(selectedDate)
  const trainingInfo = getTrainingForMonth(monthIndex)
  const training = trainingInfo?.training
  const exerciseTemplate = training?.[weekday] || []

  async function saveSetRecord(exerciseName, setIndex, reps, weight) {
    if (!user) return alert('Sign in first')
    
    const { data, error: selectError } = await supabase
      .from('workouts')
      .select('id, set_records')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .eq('exercise_name', exerciseName)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error(selectError)
      return
    }

    const setRecordsData = data?.set_records || {}
    setRecordsData[setIndex] = { reps, weight }

    if (data?.id) {
      const { error } = await supabase
        .from('workouts')
        .update({ set_records: setRecordsData })
        .eq('id', data.id)
      if (error) console.error(error)
      else fetchWorkouts()
    } else {
      const { error } = await supabase
        .from('workouts')
        .insert([{
          user_id: user.id,
          date: selectedDate,
          exercise_name: exerciseName,
          set_records: setRecordsData,
          sets: exerciseTemplate.find(e => e.name === exerciseName)?.sets || 1,
          reps: reps || 0,
          weight: weight || 0
        }])
      if (error) console.error(error)
      else fetchWorkouts()
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
      <h2 className="mb-4">{dateDisplay}</h2>

      {exerciseTemplate.length === 0 ? (
        <div className="alert alert-info">No training scheduled for {weekday}</div>
      ) : (
        <div className="row g-4">
          {exerciseTemplate.map((exercise) => {
            const myRecord = workouts.find(w => w.exercise_name === exercise.name)
            const mySetRecords = myRecord?.set_records || {}

            return (
              <div key={exercise.name} className="col-md-6 col-lg-4">
                <div className="card">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">{exercise.name}</h5>
                    <small>Target: {exercise.sets}x{exercise.reps} @ {exercise.weight}kg</small>
                  </div>
                  <div className="card-body">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Set</th>
                          <th>Reps</th>
                          <th>Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: exercise.sets }).map((_, setIndex) => (
                          <tr key={setIndex}>
                            <td><strong>{setIndex + 1}</strong></td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Reps"
                                defaultValue={''}
                                onBlur={(e) => saveSetRecord(exercise.name, setIndex, Number(e.target.value), mySetRecords[setIndex]?.weight)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Weight"
                                defaultValue={''}
                                onBlur={(e) => saveSetRecord(exercise.name, setIndex, mySetRecords[setIndex]?.reps, Number(e.target.value))}
                              />
                            </td>
                          </tr>
                        ))}
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
