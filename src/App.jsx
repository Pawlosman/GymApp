import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import WorkoutList from './components/WorkoutList'
import Sidebar from './components/Sidebar'
import Statistics from './components/Statistics'

export default function App() {
  const [session, setSession] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [currentPage, setCurrentPage] = useState('workouts')

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
          <Sidebar onSelectDate={(d) => setSelectedDate(d)} selectedDate={selectedDate} />
          <div style={{ flex: 1 }}>
            <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 sticky-top shadow-sm">
              <div className="container-fluid">
                <div className="d-flex gap-2 align-items-center" style={{ marginLeft: '50px' }}>
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
                <div className="ms-auto">
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={async () => {
                      await supabase.auth.signOut()
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </nav>
            {currentPage === 'workouts' ? (
              <WorkoutList user={session.user} selectedDate={selectedDate} />
            ) : (
              <Statistics user={session.user} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
