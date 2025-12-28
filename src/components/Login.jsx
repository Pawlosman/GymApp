import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setError(null)
    setLoading(true)

    // Set session persistence based on Remember Me checkbox
    const persistSession = rememberMe ? 'local' : 'session'

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // Remember me for 30 days if checked
        ...(rememberMe && { refreshToken: true })
      }
    })

    if (error) {
      setError(error.message)
    } else {
      // Update auth persistence setting
      await supabase.auth.setSession({
        access_token: (await supabase.auth.getSession()).data.session?.access_token,
        refresh_token: (await supabase.auth.getSession()).data.session?.refresh_token,
      })
    }
    setLoading(false)
  }

  async function signUp() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setError('Check your email for the confirmation link!')
    }
    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      signIn()
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h1 className="h3 mb-3 fw-bold text-primary">Gym App</h1>
                  <p className="text-muted">Track your workouts and progress</p>
                </div>

                {error && (
                  <div className={`alert ${error.includes('Check your email') ? 'alert-info' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                  </div>
                )}

                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">Email address</label>
                    <input
                      id="email"
                      type="email"
                      className="form-control form-control-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="your@email.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label fw-semibold">Password</label>
                    <input
                      id="password"
                      type="password"
                      className="form-control form-control-lg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                      />
                      <label className="form-check-label text-muted" htmlFor="rememberMe">
                        Remember me for 30 days
                      </label>
                    </div>
                  </div>

                  <div className="d-grid gap-2 mb-3">
                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={signIn}
                      disabled={loading || !email || !password}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </div>

                  <div className="text-center">
                    <hr className="my-4" />
                    <p className="text-muted mb-3">Don't have an account?</p>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={signUp}
                      disabled={loading || !email || !password}
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="text-center mt-4">
              <p className="text-muted small">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
