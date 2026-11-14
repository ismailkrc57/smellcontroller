import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../services/api'
import { setSession } from '../services/session'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = mode === 'login'
        ? await auth.login(email, password)
        : await auth.register(name, email, password)
      setSession(data)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Sunucuya ulaşılamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <header className="login-nav">
        <a href="/" className="login-brand"><img src="/smellcontrol-logo.png" alt="SmellControl" /></a>
        <a href="/" className="login-back">← Back to site</a>
      </header>

      <div className="login-main">
        <div className="login-visual" aria-hidden="true">
          <img src="/media/product/hero-4k.webp" alt="" />
          <p>Live monitoring, model training and odor detection — all in one dashboard.</p>
        </div>

        <div className="login-card">
          <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}<span className="dot">.</span></h1>
          <p className="login-sub">
            {mode === 'login'
              ? 'Sign in to access your SmellControl dashboard.'
              : 'Sign up to start using the SmellControl dashboard.'}
          </p>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </label>
            )}
            <label>
              Email *
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </label>
            <label>
              Password *
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </label>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          <div className="login-switch">
            {mode === 'login' ? (
              <>No account? <button onClick={() => { setMode('register'); setError('') }}>Sign up</button></>
            ) : (
              <>Already have an account? <button onClick={() => { setMode('login'); setError('') }}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
