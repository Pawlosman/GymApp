import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import trainingsData from '../../data/trainings.json'

const TRAIN_DAYS = [2, 4, 6]
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function getWeekdayName(isoDate) {
  const date = new Date(isoDate + 'T00:00:00Z')
  return WEEKDAY_NAMES[date.getUTCDay()]
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
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || isoDate(new Date()))
  const [workouts, setWorkouts] = useState([])
  const [setRecords, setSetRecords] = useState({})

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
    else {
      setWorkouts(data || [])
      // Initialize set records
      const records = {}
      data.forEach(w => {
        if (!records[w.exercise_name]) {
          records[w.exercise_name] = w.set_records || {}
        }
      })
      setSetRecords(records)
    }
  }

  const dateObj = new Date(selectedDate + 'T00:00:00Z')
  const monthIndex = dateObj.getUTCMonth()
  const weekday = getWeekdayName(selectedDate)
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

  return (
    <div className="container-fluid p-4">
      <h2>Workout for {selectedDate} ({weekday})</h2>

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
                                defaultValue={mySetRecords[setIndex]?.reps || ''}
                                onBlur={(e) => saveSetRecord(exercise.name, setIndex, Number(e.target.value), mySetRecords[setIndex]?.weight)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Weight"
                                defaultValue={mySetRecords[setIndex]?.weight || ''}
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

      {workouts.length > 0 && (
        <div className="mt-4">
          <h4>Recorded Workouts</h4>
          <div className="list-group">
            {workouts.map((w) => (
              <div key={w.id} className="list-group-item">
                <h6 className="mb-2">{w.exercise_name}</h6>
                <small className="text-muted">
                  {w.sets}x{w.reps} @ {w.weight}kg
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
