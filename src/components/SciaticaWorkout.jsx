import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import trainingsData from '../../data/trainings.json'

const EXERCISES = trainingsData.sciaticaExercises

function isoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateDisplay(isoDateStr) {
  const [year, month, day] = isoDateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${names[date.getDay()]} ${day}/${month}/${year}`
}

const audioCtxRef = { current: null }

function getAudioCtx() {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtxRef.current
}

function tick() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 600
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.08)
  } catch (e) {}
}

function beep() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.8, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch (e) {}
}

function AllImages({ images }) {
  return (
    <div>
      {images.map((img, i) => (
        <img
          key={i}
          src={`/exercises/${img}`}
          alt=""
          style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '260px', backgroundColor: '#f8f9fa' }}
          onError={e => { e.target.style.display = 'none' }}
        />
      ))}
    </div>
  )
}

function TimerSide({ label, duration, done, onDone }) {
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(duration)
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function start() {
    if (done) return
    setRunning(true)
    setRemaining(duration)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          beep()
          onDone()
          return 0
        }
        tick()
        return prev - 1
      })
    }, 1000)
  }

  function reset() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setRemaining(duration)
  }

  const pct = ((duration - remaining) / duration) * 100
  const r = 32
  const circ = 2 * Math.PI * r

  return (
    <div className={`flex-fill text-center p-2 rounded border ${done ? 'border-success bg-success bg-opacity-10' : 'border-secondary'}`}>
      <div className="fw-bold mb-2" style={{ fontSize: '0.85rem' }}>{label}</div>
      {done ? (
        <div className="text-success fw-bold fs-5">✓</div>
      ) : (
        <>
          <div style={{ position: 'relative', width: 74, height: 74, margin: '0 auto 8px' }}>
            <svg width="74" height="74" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="37" cy="37" r={r} fill="none" stroke="#e9ecef" strokeWidth="7" />
              <circle
                cx="37" cy="37" r={r} fill="none"
                stroke={running ? '#ffc107' : '#6c757d'}
                strokeWidth="7"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct / 100)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '1.1rem', fontWeight: 'bold' }}>
              {remaining}s
            </div>
          </div>
          {!running ? (
            <button className="btn btn-warning btn-sm fw-bold px-3" onClick={start}>▶ Start</button>
          ) : (
            <button className="btn btn-outline-secondary btn-sm" onClick={reset}>↺</button>
          )}
        </>
      )}
    </div>
  )
}

function TimerExercise({ exercise, doneLeft, doneRight, onDoneLeft, onDoneRight }) {
  const allDone = exercise.bilateral ? (doneLeft && doneRight) : doneLeft

  return (
    <div className={`card ${allDone ? 'border-success' : ''}`}>
      <AllImages images={exercise.images} />
      <div className={`card-header ${allDone ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0 fw-bold">{exercise.id}. {exercise.name}</h6>
            <small>{exercise.duration}s hold{exercise.bilateral ? ' each leg' : ''}</small>
          </div>
          {allDone && <span style={{ fontSize: '1.4rem' }}>✓</span>}
        </div>
      </div>
      <div className="card-body">
        {exercise.bilateral ? (
          <div className="d-flex gap-2">
            <TimerSide label="Left leg" duration={exercise.duration} done={doneLeft} onDone={onDoneLeft} />
            <TimerSide label="Right leg" duration={exercise.duration} done={doneRight} onDone={onDoneRight} />
          </div>
        ) : (
          <TimerSide label="" duration={exercise.duration} done={doneLeft} onDone={onDoneLeft} />
        )}
      </div>
    </div>
  )
}

function RepsExercise({ exercise, doneLeft, doneRight, onDoneLeft, onDoneRight }) {
  const allDone = exercise.bilateral ? (doneLeft && doneRight) : doneLeft

  return (
    <div className={`card ${allDone ? 'border-success' : ''}`}>
      <AllImages images={exercise.images} />
      <div className={`card-header text-white ${allDone ? 'bg-success' : 'bg-info'}`}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0 fw-bold">{exercise.id}. {exercise.name}</h6>
            <small>{exercise.note || `${exercise.reps} reps${exercise.bilateral ? ' each leg' : ''}`}</small>
          </div>
          {allDone && <span style={{ fontSize: '1.4rem' }}>✓</span>}
        </div>
      </div>
      <div className="card-body">
        {exercise.bilateral ? (
          <div className="d-flex gap-2">
            <div className={`flex-fill text-center p-2 rounded border ${doneLeft ? 'border-success bg-success bg-opacity-10' : 'border-secondary'}`}>
              <div className="fw-bold mb-2" style={{ fontSize: '0.85rem' }}>Left leg</div>
              {doneLeft ? (
                <div className="text-success fw-bold fs-5">✓</div>
              ) : (
                <button className="btn btn-info text-white btn-sm fw-bold px-3" onClick={onDoneLeft}>✓ Done</button>
              )}
            </div>
            <div className={`flex-fill text-center p-2 rounded border ${doneRight ? 'border-success bg-success bg-opacity-10' : 'border-secondary'}`}>
              <div className="fw-bold mb-2" style={{ fontSize: '0.85rem' }}>Right leg</div>
              {doneRight ? (
                <div className="text-success fw-bold fs-5">✓</div>
              ) : (
                <button className="btn btn-info text-white btn-sm fw-bold px-3" onClick={onDoneRight}>✓ Done</button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-muted mb-2" style={{ fontSize: '1.1rem' }}>{exercise.note || `${exercise.reps}×`}</div>
            {doneLeft ? (
              <div className="text-success fw-bold fs-5">Done! ✓</div>
            ) : (
              <button className="btn btn-info text-white fw-bold px-4" onClick={onDoneLeft}>✓ Done</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SciaticaWorkout({ user, selectedDate: externalDate }) {
  const today = isoDate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [completed, setCompleted] = useState({})

  useEffect(() => {
    if (externalDate) setSelectedDate(externalDate)
  }, [externalDate])

  useEffect(() => {
    loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user])

  async function loadSession() {
    setCompleted({})
    const local = localStorage.getItem(`sciatica_${user?.id}_${selectedDate}`)
    if (local) {
      try { setCompleted(JSON.parse(local)) } catch {}
    }
    if (navigator.onLine && user) {
      const { data } = await supabase
        .from('sciatica_sessions')
        .select('completed')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .maybeSingle()
      if (data?.completed) {
        setCompleted(data.completed)
        localStorage.setItem(`sciatica_${user.id}_${selectedDate}`, JSON.stringify(data.completed))
      }
    }
  }

  async function markDone(key) {
    const updated = { ...completed, [key]: true }
    setCompleted(updated)
    localStorage.setItem(`sciatica_${user?.id}_${selectedDate}`, JSON.stringify(updated))

    if (navigator.onLine && user) {
      const allDone = EXERCISES.every(ex => {
        if (ex.bilateral) return updated[`${ex.id}_left`] && updated[`${ex.id}_right`]
        return updated[`${ex.id}_left`]
      })
      const payload = { user_id: user.id, date: selectedDate, completed: updated, all_done: allDone }
      const { data: existing } = await supabase
        .from('sciatica_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .maybeSingle()
      if (existing) {
        await supabase.from('sciatica_sessions').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('sciatica_sessions').insert([payload])
      }
    }
  }

  const totalSteps = EXERCISES.reduce((sum, ex) => sum + (ex.bilateral ? 2 : 1), 0)
  const doneSteps = EXERCISES.reduce((sum, ex) => {
    if (ex.bilateral) return sum + (completed[`${ex.id}_left`] ? 1 : 0) + (completed[`${ex.id}_right`] ? 1 : 0)
    return sum + (completed[`${ex.id}_left`] ? 1 : 0)
  }, 0)
  const allDone = doneSteps === totalSteps

  return (
    <div className="container p-4" style={{ maxWidth: 640 }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-0">🧘 Sciatica</h2>
          <small className="text-muted">{formatDateDisplay(selectedDate)}</small>
        </div>
        <span className="badge bg-secondary fs-6">{doneSteps}/{totalSteps} done</span>
      </div>

      {allDone && (
        <div className="alert alert-success fw-bold text-center mb-4">
          🎉 All exercises complete! Great job!
        </div>
      )}

      <div className="d-flex flex-column gap-4">
        {EXERCISES.map(exercise => (
          exercise.type === 'timer' ? (
            <TimerExercise
              key={exercise.id}
              exercise={exercise}
              doneLeft={!!completed[`${exercise.id}_left`]}
              doneRight={!!completed[`${exercise.id}_right`]}
              onDoneLeft={() => markDone(`${exercise.id}_left`)}
              onDoneRight={() => markDone(`${exercise.id}_right`)}
            />
          ) : (
            <RepsExercise
              key={exercise.id}
              exercise={exercise}
              doneLeft={!!completed[`${exercise.id}_left`]}
              doneRight={!!completed[`${exercise.id}_right`]}
              onDoneLeft={() => markDone(`${exercise.id}_left`)}
              onDoneRight={() => markDone(`${exercise.id}_right`)}
            />
          )
        ))}
      </div>
    </div>
  )
}
