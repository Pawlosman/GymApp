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
      <Sidebar onSelectDate={(d) => setSelectedDate(d)} />
      {!session ? (
        <div className="container-fluid p-4">
          <h1>GymApp</h1>
          <Login />
        </div>
      ) : (
        <div className="container-fluid p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1>GymApp</h1>
            <button className="btn btn-danger" onClick={async () => {
              await supabase.auth.signOut()
            }}>
              Logout
            </button>
          </div>
          <WorkoutList user={session.user} selectedDate={selectedDate} />
        </div>
      )}
    </div>
  )
}
