import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const TRAIN_DAYS = [2, 4, 6] // Tue, Thu, Sat (ISO weekday: Mon=1)

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export default function WorkoutList({ user, plan = {}, selectedDate: externalSelectedDate }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || isoDate(new Date()))
  const [workouts, setWorkouts] = useState([])
  const [form, setForm] = useState({ exercise_name: '', sets: 3, reps: 8, weight: 0 })

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

  async function addWorkout(e) {
    e.preventDefault()
    if (!user) return alert('Sign in first')
    const payload = { ...form, user_id: user.id, date: selectedDate }
    const { error } = await supabase.from('workouts').insert([payload])
    if (error) console.error(error)
    else {
      setForm({ exercise_name: '', sets: 3, reps: 8, weight: 0 })
      fetchWorkouts()
    }
  }

  function daysForMonth(yearMonth) {
    const [y, m] = yearMonth.split('-').map(Number)
    const days = []
    const date = new Date(y, m - 1, 1)
    while (date.getMonth() === m - 1) {
      const iso = isoDate(new Date(date))
      const isoWeekday = date.getDay() === 0 ? 7 : date.getDay()
      if (TRAIN_DAYS.includes(isoWeekday)) days.push(iso)
      date.setDate(date.getDate() + 1)
    }
    return days
  }

  return (
    <div className="workouts">
      <h2>Workouts for {month}</h2>

      <label>
        Month:
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>

      <div className="day-list">
        {daysForMonth(month).map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className={d === selectedDate ? 'selected' : ''}
          >
            {d}
          </button>
        ))}
      </div>

      <h3>Selected: {selectedDate}</h3>

      <div className="plan">
        <h4>Planned exercises</h4>
        {(plan[month] || [])
          .filter((p) => p.date === selectedDate)
          .map((p) => (
            <div key={p.date} className="planned">
              <strong>{p.day}</strong>
              <ul>
                {p.exercises.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      <ul>
        {workouts.map((w) => (
          <li key={w.id}>
            {w.exercise_name} — {w.sets}x{w.reps} @ {w.weight}kg
          </li>
        ))}
        {workouts.length === 0 && <li>No workouts for this date</li>}
      </ul>

      <form onSubmit={addWorkout} className="add-form">
        <input
          placeholder="Exercise name"
          value={form.exercise_name}
          onChange={(e) => setForm({ ...form, exercise_name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Sets"
          value={form.sets}
          onChange={(e) => setForm({ ...form, sets: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Reps"
          value={form.reps}
          onChange={(e) => setForm({ ...form, reps: Number(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Weight kg"
          value={form.weight}
          onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
        />
        <button type="submit">Add workout</button>
      </form>
    </div>
  )
}
