import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import UserSelect from './components/UserSelect'
import WorkoutList from './components/WorkoutList'
import Sidebar from './components/Sidebar'
import Statistics from './components/Statistics'
import SciaticaWorkout from './components/SciaticaWorkout'
import SciaticaStatistics from './components/SciaticaStatistics'

const ADMIN_EMAIL = 'pawel.przenioslo@gmail.com'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [currentPage, setCurrentPage] = useState('workouts')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [inviting, setInviting] = useState(false)

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

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true)
    setInviteStatus(null)
    const { error } = await supabase.auth.resetPasswordForEmail(inviteEmail, {
      redirectTo: window.location.origin
    })
    if (error) {
      setInviteStatus({ ok: false, msg: error.message })
    } else {
      setInviteStatus({ ok: true, msg: `Invite sent to ${inviteEmail}` })
      setInviteEmail('')
    }
    setInviting(false)
  }

  if (!session) return <Login />
  if (!profile) return <UserSelect onSelect={setProfile} />

  const isSciatica = profile === 'sciatica'
  const isAdmin = session.user.email === ADMIN_EMAIL

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
        <nav className="navbar px-3 py-2 sticky-top shadow-sm bg-body-tertiary">
          <div className="d-flex align-items-center gap-2 flex-wrap" style={{ marginLeft: '50px', flex: 1 }}>
            <span className={`badge d-flex align-items-center gap-1 ${profileBadgeColor}`} style={{ fontSize: '0.8rem', padding: '4px 7px', whiteSpace: 'nowrap' }}>
              <img src={profilePhoto} alt="" style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: '3px' }} />
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
              Stats
            </button>
            {isAdmin && (
              <button className="btn btn-outline-info btn-sm" onClick={() => setShowInvite(v => !v)}>
                + Invite
              </button>
            )}
          </div>
          <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-outline-secondary btn-sm" onClick={handleSwitchUser}>Switch</button>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        {showInvite && isAdmin && (
          <div className="container-fluid px-4 pt-3">
            <div className="card border-info" style={{ maxWidth: 420 }}>
              <div className="card-body">
                <h6 className="card-title text-info mb-3">Invite a new user</h6>
                <p className="text-muted small mb-2">They will receive a password reset link to set their password and log in.</p>
                <div className="d-flex gap-2">
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  />
                  <button className="btn btn-info btn-sm text-white" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                    {inviting ? '…' : 'Send'}
                  </button>
                </div>
                {inviteStatus && (
                  <div className={`mt-2 small ${inviteStatus.ok ? 'text-success' : 'text-danger'}`}>{inviteStatus.msg}</div>
                )}
              </div>
            </div>
          </div>
        )}

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
