import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        ...(rememberMe && { refreshToken: true })
      }
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  async function signUp() {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data?.session) {
      setSuccessMessage('Registration successful. You are now signed in.')
    } else {
      setSuccessMessage('Registration successful. Check your email for confirmation.')
    }

    setLoading(false)
  }

  async function resetPassword() {
    if (!email) {
      setError('Enter an email address first.')
      return
    }

    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccessMessage(`Password reset email sent to ${email}.`)
    }
    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      isRegistering ? signUp() : signIn()
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    isRegistering ? signUp() : signIn()
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h1 className="h3 mb-3 fw-bold text-primary">{isRegistering ? 'Create Account' : 'Sign In'}</h1>
                  <p className="text-muted">Track your workouts and progress</p>
                </div>

                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                  </div>
                )}

                {successMessage && (
                  <div className="alert alert-success alert-dismissible fade show" role="alert">
                    {successMessage}
                    <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
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
                    <div className="input-group input-group-lg">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword((value) => !value)}
                        disabled={loading}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {!isRegistering && (
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
                  )}

                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading || !email || (!isRegistering && !password)}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          {isRegistering ? 'Registering...' : 'Signing in...'}
                        </>
                      ) : (
                        isRegistering ? 'Create account' : 'Sign In'
                      )}
                    </button>
                  </div>

                  {!isRegistering && (
                    <div className="d-grid gap-2 mt-3">
                      <button
                      type="button"
                      className="btn btn-outline-warning btn-lg"
                      onClick={resetPassword}
                      disabled={loading || !email}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Sending reset email...
                        </>
                      ) : (
                        'Forgot password? Reset'
                      )}
                    </button>
                  </div>
                )}
                </form>
              </div>
            </div>

            <div className="text-center mt-4">
              <p className="text-muted small">
                {isRegistering
                  ? 'Already have an account? '
                  : 'New to GymApp? '}
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={() => {
                    setIsRegistering(!isRegistering)
                    setError(null)
                    setSuccessMessage(null)
                  }}
                >
                  {isRegistering ? 'Sign in' : 'Register'}
                </button>
              </p>
              <p className="text-muted small">
                By signing in or registering, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
