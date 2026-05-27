import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import UserSelect from './components/UserSelect'
import WorkoutList from './components/WorkoutList'
import Sidebar from './components/Sidebar'
import Statistics from './components/Statistics'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // 'tata' | 'tomek'
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTraining, setSelectedTraining] = useState(null) // for Tomek: 'Workout A: Chest & Arms' | 'Workout B: Legs, Back & Shoulders'
  const [currentPage, setCurrentPage] = useState('workouts')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setProfile(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function handleSelectDate(date, training = null) {
    setSelectedDate(date)
    if (training) setSelectedTraining(training)
  }

  function handleLogout() {
    setProfile(null)
    setSelectedDate(null)
    setSelectedTraining(null)
    supabase.auth.signOut()
  }

  if (!session) return <Login />
  if (!profile) return <UserSelect onSelect={setProfile} />

  return (
    <div className="app">
      <Sidebar
        onSelectDate={handleSelectDate}
        selectedDate={selectedDate}
        profile={profile}
        selectedTraining={selectedTraining}
      />
      <div style={{ flex: 1 }}>
        <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 sticky-top shadow-sm">
          <div className="container-fluid">
            <div className="d-flex gap-2 align-items-center" style={{ marginLeft: '50px' }}>
              <span className="badge bg-secondary me-2" style={{ fontSize: '0.85rem' }}>
                {profile === 'tata' ? '💪 Tata' : '🏋️ Tomek'}
              </span>
              <button
                className={`btn btn-sm ${currentPage === 'workouts' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setCurrentPage('workouts')}
              >
                Workouts
              </button>
              <button
                className={`btn btn-sm ${currentPage === 'statistics' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setCurrentPage('statistics')}
              >
                Statistics
              </button>
            </div>
            <div className="ms-auto d-flex gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => { setProfile(null); setSelectedDate(null); setSelectedTraining(null) }}
              >
                Switch User
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </nav>
        {currentPage === 'workouts' ? (
          <WorkoutList
            user={session.user}
            profile={profile}
            selectedDate={selectedDate}
            selectedTraining={selectedTraining}
          />
        ) : (
          <Statistics user={session.user} profile={profile} />
        )}
      </div>
    </div>
  )
}
