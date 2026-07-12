import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import trainingsData from '../../data/trainings.json'

const PLANS = trainingsData.calisthenicsPlans

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

const COUNTDOWN_LABELS = ['Ready', 'Set', 'Go!']

function countdownBeep(step) {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = step === 2 ? 1200 : step === 1 ? 900 : 660
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {}
}

function PlankTimer({ duration, done, onDone }) {
  const [phase, setPhase] = useState('idle')
  const [countdown, setCountdown] = useState(3)
  const [remaining, setRemaining] = useState(duration)
  const intervalRef = useRef(null)

  useEffect(() => () => clearInterval(intervalRef.current), [])

  function start() {
    if (done) return
    setPhase('countdown')
    setCountdown(3)
    setRemaining(duration)
    let step = 0
    countdownBeep(step)
    intervalRef.current = setInterval(() => {
      step++
      if (step < 3) {
        countdownBeep(step)
        setCountdown(3 - step)
      } else {
        clearInterval(intervalRef.current)
        setPhase('running')
        let rem = duration
        intervalRef.current = setInterval(() => {
          rem--
          setRemaining(rem)
          if (rem <= 0) {
            clearInterval(intervalRef.current)
            setPhase('idle')
            beep()
            onDone()
          } else {
            tick()
          }
        }, 1000)
      }
    }, 1000)
  }

  function reset() {
    clearInterval(intervalRef.current)
    setPhase('idle')
    setRemaining(duration)
    setCountdown(3)
  }

  const pct = phase === 'running' ? ((duration - remaining) / duration) * 100 : 0
  const r = 32
  const circ = 2 * Math.PI * r
  const isRunning = phase === 'running'
  const isCountdown = phase === 'countdown'

  if (done) {
    return <div className="text-success fw-bold fs-5 text-center py-2">Done! ✓</div>
  }

  return (
    <div className="text-center">
      <div style={{ position: 'relative', width: 74, height: 74, margin: '0 auto 8px' }}>
        <svg width="74" height="74" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="37" cy="37" r={r} fill="none" stroke="#444" strokeWidth="7" />
          <circle
            cx="37" cy="37" r={r} fill="none"
            stroke={isRunning ? '#ffc107' : isCountdown ? '#17a2b8' : '#6c757d'}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={isRunning ? circ * (1 - pct / 100) : circ}
            style={{ transition: isRunning ? 'stroke-dashoffset 1s linear' : 'none' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontWeight: 'bold', lineHeight: 1 }}>
          {isCountdown
            ? <span style={{ fontSize: '0.85rem', color: '#17a2b8' }}>{COUNTDOWN_LABELS[3 - countdown]}</span>
            : <span style={{ fontSize: '1.1rem' }}>{remaining}s</span>
          }
        </div>
      </div>
      {phase === 'idle' ? (
        <button className="btn btn-warning btn-sm fw-bold px-3" onClick={start}>▶ Start</button>
      ) : (
        <button className="btn btn-outline-secondary btn-sm" onClick={reset}>↺</button>
      )}
    </div>
  )
}

function SetTracker({ exercise, setsDone, onSetDone, planKey }) {
  const isDone = setsDone >= exercise.sets
  const isTimer = exercise.type === 'timer'

  return (
    <div className={`card ${isDone ? 'border-success' : 'border-secondary'}`}>
      <img
        src={`/exercises/${exercise.image}`}
        alt=""
        style={{ width: '100%', objectFit: 'cover', maxHeight: '220px', display: 'block' }}
        onError={e => { e.target.style.display = 'none' }}
      />
      <div className={`card-header ${isDone ? 'bg-success text-white' : 'bg-dark text-white'}`}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0 fw-bold">{exercise.id}. {exercise.name}</h6>
            <small>
              {isTimer ? `${exercise.duration}s hold` : `${exercise.reps} reps`} &bull; {exercise.sets} sets
            </small>
          </div>
          {isDone && <span style={{ fontSize: '1.4rem' }}>✓</span>}
        </div>
      </div>
      <div className="card-body">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="d-flex gap-1">
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < setsDone ? '#198754' : '#444',
                  border: '2px solid ' + (i < setsDone ? '#198754' : '#6c757d'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.75rem', fontWeight: 'bold'
                }}
              >
                {i < setsDone ? '✓' : i + 1}
              </div>
            ))}
          </div>
          {!isDone && (
            <div className="ms-auto">
              {isTimer ? (
                <PlankTimer
                  duration={exercise.duration}
                  done={false}
                  onDone={onSetDone}
                />
              ) : (
                <button className="btn btn-primary btn-sm fw-bold px-3" onClick={onSetDone}>
                  ✓ Set {setsDone + 1}
                </button>
              )}
            </div>
          )}
          {isDone && (
            <div className="ms-auto text-success fw-bold">Complete!</div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlanSelector({ selected, onSelect }) {
  const planNames = Object.keys(PLANS)
  return (
    <div className="d-flex gap-3 mb-4 flex-wrap">
      {planNames.map(name => (
        <button
          key={name}
          className={`btn fw-bold px-4 ${selected === name ? 'btn-warning' : 'btn-outline-warning'}`}
          onClick={() => onSelect(name)}
        >
          {name}
        </button>
      ))}
    </div>
  )
}

export default function CalisthenicsWorkout({ user, selectedDate: externalDate }) {
  const today = isoDate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedPlan, setSelectedPlan] = useState('Calisthenics Plan 1')
  const [completed, setCompleted] = useState({})
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSync, setPendingSync] = useState(false)

  useEffect(() => {
    if (externalDate) setSelectedDate(externalDate)
  }, [externalDate])

  useEffect(() => {
    const on = () => { setIsOnline(true); syncPending() }
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [user])

  useEffect(() => {
    loadSession()
  }, [selectedDate, selectedPlan, user])

  function localKey(date, plan) { return `calisthenics_${user?.id}_${date}_${plan}` }
  function pendingKey() { return `calisthenics_pending_${user?.id}` }
  function getPending() { try { return JSON.parse(localStorage.getItem(pendingKey()) || '[]') } catch { return [] } }

  async function syncPending() {
    if (!user || !navigator.onLine) return
    const pending = getPending()
    for (const entry of pending) {
      const { date, plan } = entry
      const raw = localStorage.getItem(localKey(date, plan))
      if (!raw) continue
      try {
        const comp = JSON.parse(raw)
        const exercises = PLANS[plan] || []
        const allDone = exercises.every(ex => (comp[ex.id] || 0) >= ex.sets)
        const payload = { user_id: user.id, date, plan, completed: comp, all_done: allDone }
        const { data: existing } = await supabase.from('calisthenics_sessions').select('id').eq('user_id', user.id).eq('date', date).eq('plan', plan).maybeSingle()
        if (existing) await supabase.from('calisthenics_sessions').update(payload).eq('id', existing.id)
        else await supabase.from('calisthenics_sessions').insert([payload])
      } catch {}
    }
    localStorage.removeItem(pendingKey())
    setPendingSync(false)
  }

  async function loadSession() {
    setCompleted({})
    setPendingSync(false)
    const pending = getPending()
    const local = localStorage.getItem(localKey(selectedDate, selectedPlan))
    if (local) {
      try { setCompleted(JSON.parse(local)) } catch {}
      if (pending.some(e => e.date === selectedDate && e.plan === selectedPlan)) setPendingSync(true)
    }
    if (navigator.onLine && user) {
      const { data } = await supabase
        .from('calisthenics_sessions')
        .select('completed')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .eq('plan', selectedPlan)
        .maybeSingle()
      if (data?.completed) {
        setCompleted(data.completed)
        localStorage.setItem(localKey(selectedDate, selectedPlan), JSON.stringify(data.completed))
        setPendingSync(false)
      }
    }
  }

  async function markSetDone(exerciseId) {
    const current = completed[exerciseId] || 0
    const updated = { ...completed, [exerciseId]: current + 1 }
    setCompleted(updated)
    localStorage.setItem(localKey(selectedDate, selectedPlan), JSON.stringify(updated))

    if (navigator.onLine && user) {
      const exercises = PLANS[selectedPlan] || []
      const allDone = exercises.every(ex => (updated[ex.id] || 0) >= ex.sets)
      const payload = { user_id: user.id, date: selectedDate, plan: selectedPlan, completed: updated, all_done: allDone }
      const { data: existing } = await supabase.from('calisthenics_sessions').select('id').eq('user_id', user.id).eq('date', selectedDate).eq('plan', selectedPlan).maybeSingle()
      if (existing) await supabase.from('calisthenics_sessions').update(payload).eq('id', existing.id)
      else await supabase.from('calisthenics_sessions').insert([payload])
    } else {
      const pending = getPending()
      if (!pending.some(e => e.date === selectedDate && e.plan === selectedPlan)) {
        pending.push({ date: selectedDate, plan: selectedPlan })
        localStorage.setItem(pendingKey(), JSON.stringify(pending))
      }
      setPendingSync(true)
    }
  }

  const exercises = PLANS[selectedPlan] || []
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const doneSets = exercises.reduce((sum, ex) => sum + Math.min(completed[ex.id] || 0, ex.sets), 0)
  const allDone = doneSets === totalSets

  return (
    <div className="container p-4" style={{ maxWidth: 640 }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="mb-0">Calisthenics</h2>
          <small className="text-muted">{formatDateDisplay(selectedDate)}</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-secondary">{doneSets}/{totalSets} sets</span>
          {!isOnline && <span className="badge bg-warning text-dark">⚠ Offline</span>}
          {isOnline && pendingSync && <span className="badge bg-info text-dark">⏳ Pending Sync</span>}
          {isOnline && !pendingSync && <span className="badge bg-success">✓ Synced</span>}
        </div>
      </div>

      <PlanSelector selected={selectedPlan} onSelect={plan => { setSelectedPlan(plan); setCompleted({}) }} />

      {allDone && (
        <div className="alert alert-success fw-bold text-center mb-4">
          All sets complete! Great work!
        </div>
      )}

      <div className="d-flex flex-column gap-4">
        {exercises.map(exercise => (
          <SetTracker
            key={exercise.id}
            exercise={exercise}
            setsDone={Math.min(completed[exercise.id] || 0, exercise.sets)}
            onSetDone={() => markSetDone(exercise.id)}
            planKey={selectedPlan}
          />
        ))}
      </div>
    </div>
  )
}
