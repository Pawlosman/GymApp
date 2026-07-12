import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import UserSelect from './components/UserSelect'
import WorkoutList from './components/WorkoutList'
import Sidebar from './components/Sidebar'
import Statistics from './components/Statistics'
import SciaticaWorkout from './components/SciaticaWorkout'
import SciaticaStatistics from './components/SciaticaStatistics'
import CalisthenicsWorkout from './components/CalisthenicsWorkout'

const ADMIN_EMAIL = 'pawel.przenioslo@gmail.com'

function timeAgo(isoStr) {
  if (!isoStr) return 'Never'
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(isoStr).toLocaleDateString()
}

function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [inviting, setInviting] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_get_users')
    if (!error) setUsers(data || [])
    setLoading(false)
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true)
    setInviteStatus(null)
    const { data: { session: s } } = await supabase.auth.getSession()
    const res = await fetch('https://xgogkjppmbdrinzmnzjm.supabase.co/functions/v1/invite-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s.access_token}`
      },
      body: JSON.stringify({ email: inviteEmail })
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      setInviteStatus({ ok: false, msg: json.error || 'Failed to send invite' })
    } else {
      setInviteStatus({ ok: true, msg: `Invite sent to ${inviteEmail}` })
      setInviteEmail('')
    }
    setInviting(false)
  }

  return (
    <div className="container-fluid px-4 pt-3 pb-4">
      <div className="card border-info" style={{ maxWidth: 600 }}>
        <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
          <span className="fw-bold">Admin Panel</span>
          <button className="btn-close btn-close-white btn-sm" onClick={onClose} />
        </div>
        <div className="card-body">

          <h6 className="mb-3">Users</h6>
          {loading ? (
            <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-info" /></div>
          ) : (
            <table className="table table-sm mb-4">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{u.email}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }} className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <span className={u.last_sign_in_at && (Date.now() - new Date(u.last_sign_in_at) < 86400000) ? 'text-success fw-bold' : 'text-muted'}>
                        {timeAgo(u.last_sign_in_at)}
                      </span>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <hr />

          <h6 className="mb-2">Invite new user</h6>
          <p className="text-muted small mb-2">They'll receive a link to set their password and log in.</p>
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
              {inviting ? '…' : 'Send invite'}
            </button>
          </div>
          {inviteStatus && (
            <div className={`mt-2 small ${inviteStatus.ok ? 'text-success' : 'text-danger'}`}>{inviteStatus.msg}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [currentPage, setCurrentPage] = useState('workouts')
  const [showAdmin, setShowAdmin] = useState(false)

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
    setShowAdmin(false)
  }

  if (!session) return <Login />
  if (!profile) return <UserSelect onSelect={setProfile} />

  const isSciatica = profile === 'sciatica'
  const isCalisthenics = profile === 'calisthenics'
  const isAdmin = session.user.email === ADMIN_EMAIL

  const profileLabel = profile === 'tata' ? 'PRO Training' : profile === 'tomek' ? 'LITE Training' : profile === 'sciatica' ? 'Sciatica' : 'Calisthenics'
  const profilePhoto = profile === 'tata' ? '/exercises/PRO.jpeg' : profile === 'tomek' ? '/exercises/LITE.jpg' : profile === 'sciatica' ? '/exercises/SCIATICA.jpg' : '/exercises/CALISTHENICS.webp'
  const profileBadgeColor = profile === 'tata' ? 'bg-primary' : profile === 'tomek' ? 'bg-success' : profile === 'sciatica' ? 'bg-warning text-dark' : 'bg-orange text-white'

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
              className={`btn btn-sm ${currentPage === 'workouts' && !showAdmin ? (isSciatica ? 'btn-warning' : isCalisthenics ? 'btn-warning' : 'btn-primary') : (isSciatica ? 'btn-outline-warning' : isCalisthenics ? 'btn-outline-warning' : 'btn-outline-primary')}`}
              style={isCalisthenics ? { color: currentPage === 'workouts' && !showAdmin ? undefined : '#fd7e14', borderColor: '#fd7e14' } : {}}
              onClick={() => { setCurrentPage('workouts'); setShowAdmin(false) }}
            >
              {isSciatica ? 'Exercises' : isCalisthenics ? 'Workout' : 'Workouts'}
            </button>
            <button
              className={`btn btn-sm ${currentPage === 'statistics' && !showAdmin ? (isSciatica ? 'btn-warning' : isCalisthenics ? 'btn-warning' : 'btn-primary') : (isSciatica ? 'btn-outline-warning' : isCalisthenics ? 'btn-outline-warning' : 'btn-outline-primary')}`}
              style={isCalisthenics ? { color: currentPage === 'statistics' && !showAdmin ? undefined : '#fd7e14', borderColor: '#fd7e14' } : {}}
              onClick={() => { setCurrentPage('statistics'); setShowAdmin(false) }}
            >
              Stats
            </button>
            {isAdmin && (
              <button className={`btn btn-sm ${showAdmin ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setShowAdmin(v => !v)}>
                Admin
              </button>
            )}
          </div>
          <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-outline-secondary btn-sm" onClick={handleSwitchUser}>Switch</button>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        {showAdmin && isAdmin ? (
          <AdminPanel onClose={() => setShowAdmin(false)} />
        ) : isSciatica ? (
          currentPage === 'workouts' ? (
            <SciaticaWorkout user={session.user} selectedDate={selectedDate} />
          ) : (
            <SciaticaStatistics user={session.user} />
          )
        ) : isCalisthenics ? (
          <CalisthenicsWorkout user={session.user} selectedDate={selectedDate} />
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
