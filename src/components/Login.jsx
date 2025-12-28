import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  async function signIn() {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  async function signUp() {
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
  }

  return (
    <div className="auth">
      <h2>Sign in / Sign up</h2>
      {error && <div className="error">{error}</div>}
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      <div>
        <button onClick={signIn}>Sign in</button>
        <button onClick={signUp}>Sign up</button>
      </div>
    </div>
  )
}
