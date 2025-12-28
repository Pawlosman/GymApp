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
    <div className="app">
      <h1>GymApp</h1>
      {!session ? (
        <Login />
      ) : (
        <div style={{ display: 'flex', gap: 20 }}>
          <Sidebar onSelectDate={(d) => setSelectedDate(d)} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                }}
              >
                Logout
              </button>
            </div>
            <WorkoutList user={session.user} selectedDate={selectedDate} />
          </div>
        </div>
      )}
    </div>
  )
}
