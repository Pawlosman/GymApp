import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import WorkoutList from './components/WorkoutList'
import Sidebar from './components/Sidebar'
import ThemeToggle from './components/ThemeToggle'

export default function App() {
  const [session, setSession] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <div className="app">
      {!session ? (
        <Login />
      ) : (
        <>
          <Sidebar onSelectDate={(d) => setSelectedDate(d)} />
          <div style={{ flex: 1 }}>
            <nav className="navbar navbar-expand-lg navbar-light bg-light px-4">
              <div className="container-fluid">
                <span className="navbar-brand mb-0 h1">Gym App</span>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={async () => {
                    await supabase.auth.signOut()
                  }}
                >
                  Logout
                </button>
              </div>
            </nav>
            <WorkoutList user={session.user} selectedDate={selectedDate} />
          </div>
          <ThemeToggle />
        </>
      )}
    </div>
  )
}
