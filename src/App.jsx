import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import UserSelect from './components/UserSelect'
import WorkoutList from './components/WorkoutList'
import Sidebar from './components/Sidebar'
import Statistics from './components/Statistics'
import SciaticaWorkout from './components/SciaticaWorkout'
import SciaticaStatistics from './components/SciaticaStatistics'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // 'tata' | 'tomek' | 'sciatica'
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTraining, setSelectedTraining] = useState(null)
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

  function handleSwitchUser() {
    setProfile(null)
    setSelectedDate(null)
    setSelectedTraining(null)
    setCurrentPage('workouts')
  }

  if (!session) return <Login />
  if (!profile) return <UserSelect onSelect={setProfile} />

  const isSciatica = profile === 'sciatica'

  const profileLabel = profile === 'tata' ? 'PRO Training' : profile === 'tomek' ? 'LITE Training' : 'Sciatica'
  const profilePhoto = profile === 'tata' ? '/exercises/PRO.jpeg' : profile === 'tomek' ? '/exercises/LITE.jpg' : '/exercises/SCIATICA.jpg'
  const profileBadgeColor = profile === 'tata' ? 'bg-primary' : profile === 'tomek' ? 'bg-success' : 'bg-warning text-dark'

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
              <span className={`badge me-2 d-flex align-items-center gap-1 ${profileBadgeColor}`} style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                <img src={profilePhoto} alt="" style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: '4px' }} />
                {profileLabel}
              </span>
              <button
                className={`btn btn-sm ${currentPage === 'workouts' ? (isSciatica ? 'btn-warning' : 'btn-primary') : (isSciatica ? 'btn-outline-warning' : 'btn-outline-primary')}`}
                onClick={() => setCurrentPage('workouts')}
              >
                {isSciatica ? 'Exercises' : 'Workouts'}
              </button>
              <button
                className={`btn btn-sm ${currentPage === 'statistics' ? (isSciatica ? 'btn-warning' : 'btn-primary') : (isSciatica ? 'btn-outline-warning' : 'btn-outline-primary')}`}
                onClick={() => setCurrentPage('statistics')}
              >
                Statistics
              </button>
            </div>
            <div className="ms-auto d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={handleSwitchUser}>
                Switch
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </nav>

        {isSciatica ? (
          currentPage === 'workouts' ? (
            <SciaticaWorkout user={session.user} selectedDate={selectedDate} />
          ) : (
            <SciaticaStatistics user={session.user} />
          )
        ) : (
          currentPage === 'workouts' ? (
            <WorkoutList
              user={session.user}
              profile={profile}
              selectedDate={selectedDate}
              selectedTraining={selectedTraining}
            />
          ) : (
            <Statistics user={session.user} profile={profile} />
          )
        )}
      </div>
    </div>
  )
}
