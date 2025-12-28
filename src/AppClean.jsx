import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import WorkoutList from './components/WorkoutList'
import Sidebar from './components/Sidebar'

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
    <div className="app d-flex">
      {session && <Sidebar onSelectDate={(d) => setSelectedDate(d)} />}
      <div className="flex-grow-1" style={{ overflow: 'auto' }}>
        {!session ? (
          <div className="container-fluid p-4">
            <h1 className="mb-4">GymApp</h1>
            <Login />
          </div>
        ) : (
          <>
            <nav className="navbar navbar-light bg-primary sticky-top" style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
              <div className="container-fluid d-flex align-items-center">
                  <button
                    className="btn btn-outline-light btn-sm d-lg-none me-2"
                    onClick={() => window.dispatchEvent(new Event('toggleSidebar'))}
                    aria-label="Open sidebar"
                  >
                    ☰
                  </button>
                  <span className="navbar-brand mb-0 h5 text-white">GymApp</span>
                  <div className="ms-auto">
                    <button 
                      className="btn btn-outline-light btn-sm"
                      onClick={async () => {
                        await supabase.auth.signOut()
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
            </nav>
            <WorkoutList user={session.user} selectedDate={selectedDate} />
          </>
        )}
      </div>
    </div>
  )
}
