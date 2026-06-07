import React, { useState, useEffect, useRef, useCallback } from 'react'
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

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gain.gain.setValueAtTime(0.8, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.6)
  } catch (e) {
    console.warn('Audio not available:', e)
  }
}

function TimerExercise({ exercise, done, onDone }) {
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(exercise.duration)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  function start() {
    if (done) return
    setRunning(true)
    setRemaining(exercise.duration)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          beep()
          onDone()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function reset() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setRemaining(exercise.duration)
  }

  const pct = ((exercise.duration - remaining) / exercise.duration) * 100

  return (
    <div className={`card h-100 ${done ? 'border-success' : ''}`}>
      <ImageCarousel images={exercise.images} />
      <div className={`card-header text-white ${done ? 'bg-success' : 'bg-warning text-dark'}`}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0 fw-bold">{exercise.id}. {exercise.name}</h6>
            <small>{exercise.duration}s hold</small>
          </div>
          {done && <span style={{ fontSize: '1.4rem' }}>✓</span>}
        </div>
      </div>
      <div className="card-body d-flex flex-column align-items-center justify-content-center gap-3">
        {!done ? (
          <>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="45" cy="45" r="38" fill="none" stroke="#e9ecef" strokeWidth="8" />
                <circle
                  cx="45" cy="45" r="38" fill="none"
                  stroke={running ? '#ffc107' : '#6c757d'}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - pct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '1.4rem', fontWeight: 'bold' }}>
                {remaining}s
              </div>
            </div>
            <div className="d-flex gap-2">
              {!running ? (
                <button className="btn btn-warning fw-bold px-4" onClick={start}>▶ Start</button>
              ) : (
                <button className="btn btn-outline-secondary" onClick={reset}>↺ Reset</button>
              )}
            </div>
          </>
        ) : (
          <div className="text-success fw-bold fs-5">Done! ✓</div>
        )}
      </div>
    </div>
  )
}

function RepsExercise({ exercise, done, onDone }) {
  return (
    <div className={`card h-100 ${done ? 'border-success' : ''}`}>
      <ImageCarousel images={exercise.images} />
      <div className={`card-header text-white ${done ? 'bg-success' : 'bg-info'}`}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0 fw-bold">{exercise.id}. {exercise.name}</h6>
            <small>{exercise.note || `${exercise.reps} reps`}</small>
          </div>
          {done && <span style={{ fontSize: '1.4rem' }}>✓</span>}
        </div>
      </div>
      <div className="card-body d-flex flex-column align-items-center justify-content-center gap-2">
        {!done ? (
          <>
            <div className="text-muted mb-2" style={{ fontSize: '1.1rem' }}>
              {exercise.note || `${exercise.reps}×`}
            </div>
            <button
              className="btn btn-info text-white fw-bold px-4"
              onClick={onDone}
            >
              ✓ Done
            </button>
          </>
        ) : (
          <div className="text-success fw-bold fs-5">Done! ✓</div>
        )}
      </div>
    </div>
  )
}

function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % images.length), 2000)
    return () => clearInterval(t)
  }, [images.length])

  return (
    <div style={{ height: '180px', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '4px 4px 0 0' }}>
      <img
        src={`/exercises/${images[idx]}`}
        alt=""
        style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }}
        onError={e => { e.target.style.display = 'none' }}
      />
    </div>
  )
}

export default function SciaticaWorkout({ user, selectedDate: externalDate }) {
  const today = isoDate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [completed, setCompleted] = useState({}) // { exerciseId: true }
  const [saving, setSaving] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    if (externalDate) setSelectedDate(externalDate)
  }, [externalDate])

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, user])

  async function loadSession() {
    setCompleted({})
    setSessionSaved(false)

    const local = localStorage.getItem(`sciatica_${user?.id}_${selectedDate}`)
    if (local) {
      const parsed = JSON.parse(local)
      setCompleted(parsed.completed || {})
      setSessionSaved(parsed.saved || false)
    }

    if (navigator.onLine && user) {
      const { data } = await supabase
        .from('sciatica_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .maybeSingle()

      if (data) {
        setCompleted(data.completed || {})
        setSessionSaved(true)
        localStorage.setItem(`sciatica_${user.id}_${selectedDate}`, JSON.stringify({ completed: data.completed, saved: true }))
      }
    }
  }

  function markDone(id) {
    setCompleted(prev => {
      const updated = { ...prev, [id]: true }
      localStorage.setItem(`sciatica_${user?.id}_${selectedDate}`, JSON.stringify({ completed: updated, saved: false }))
      return updated
    })
  }

  const allDone = EXERCISES.every(ex => completed[ex.id])

  async function saveSession() {
    if (!user || !navigator.onLine) return
    setSaving(true)
    const { data: existing } = await supabase
      .from('sciatica_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .maybeSingle()

    const payload = { user_id: user.id, date: selectedDate, completed, all_done: allDone }

    if (existing) {
      await supabase.from('sciatica_sessions').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('sciatica_sessions').insert([payload])
    }

    localStorage.setItem(`sciatica_${user.id}_${selectedDate}`, JSON.stringify({ completed, saved: true }))
    setSessionSaved(true)
    setSaving(false)
  }

  const doneCount = Object.values(completed).filter(Boolean).length

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-0">🧘 Sciatica</h2>
          <small className="text-muted">{formatDateDisplay(selectedDate)}</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-secondary">{doneCount}/{EXERCISES.length} done</span>
          {!isOnline && <span className="badge bg-warning text-dark">⚠ Offline</span>}
          {sessionSaved && <span className="badge bg-success">✓ Saved</span>}
          <button
            className="btn btn-warning fw-bold"
            onClick={saveSession}
            disabled={saving || !isOnline || doneCount === 0}
          >
            {saving ? 'Saving…' : 'Save Session'}
          </button>
        </div>
      </div>

      {allDone && (
        <div className="alert alert-success fw-bold text-center mb-4">
          🎉 All exercises complete! Great job! Save your session above.
        </div>
      )}

      <div className="row g-4">
        {EXERCISES.map(exercise => (
          <div key={exercise.id} className="col-md-6 col-lg-4">
            {exercise.type === 'timer' ? (
              <TimerExercise
                exercise={exercise}
                done={!!completed[exercise.id]}
                onDone={() => markDone(exercise.id)}
              />
            ) : (
              <RepsExercise
                exercise={exercise}
                done={!!completed[exercise.id]}
                onDone={() => markDone(exercise.id)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
