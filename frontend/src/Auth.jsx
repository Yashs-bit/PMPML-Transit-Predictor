import { useState } from 'react'
import axios from 'axios'

// ── Animated background orb ──────────────────────────────────────────────────
function Orb({ className }) {
  return <div className={`absolute rounded-full mix-blend-screen filter blur-3xl animate-pulse pointer-events-none ${className}`} />
}

// ── Floating label input ─────────────────────────────────────────────────────
function AuthInput({ id, type, label, value, onChange, icon, autoComplete }) {
  return (
    <div className="relative group">
      {/* Icon */}
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-indigo-400 transition-colors duration-200 pointer-events-none text-lg select-none">
        {icon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={label}
        autoComplete={autoComplete}
        required
        className="
          w-full pl-11 pr-4 py-3.5
          bg-white/5 border border-white/10
          rounded-xl text-white text-sm placeholder-white/30
          outline-none
          transition-all duration-300
          focus:border-indigo-400/70 focus:bg-white/10
          focus:ring-1 focus:ring-indigo-400/40
          hover:border-white/20
        "
      />
    </div>
  )
}

// ── Main Auth Component ───────────────────────────────────────────────────────
export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('signin')     // 'signin' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [signInForm, setSignInForm] = useState({ username: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({ username: '', email: '', password: '', confirm: '' })

  const isSignIn = mode === 'signin'

  const switchMode = (newMode) => {
    setError(null)
    setSuccessMsg(null)
    setMode(newMode)
  }

  // ── Sign In ──────────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/login', {
        username: signInForm.username,
        password: signInForm.password,
      })
      localStorage.setItem('pmpml_token', res.data.access_token)
      localStorage.setItem('pmpml_username', res.data.username)
      onLogin(res.data.access_token)
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault()
    setError(null)
    if (signUpForm.password !== signUpForm.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/register', {
        username: signUpForm.username,
        email:    signUpForm.email,
        password: signUpForm.password,
      })
      // Option A: auto-login after registration
      localStorage.setItem('pmpml_token', res.data.access_token)
      localStorage.setItem('pmpml_username', res.data.username)
      onLogin(res.data.access_token)
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* ── Animated Background Orbs ── */}
      <Orb className="w-[500px] h-[500px] bg-indigo-700/40 top-[-15%] left-[-10%] opacity-50" />
      <Orb className="w-[450px] h-[450px] bg-purple-700/40 bottom-[-15%] right-[-10%] opacity-40" style={{ animationDelay: '2s' }} />
      <Orb className="w-[350px] h-[350px] bg-pink-700/30 top-[40%] left-[55%] opacity-30" style={{ animationDelay: '4s' }} />
      <Orb className="w-[300px] h-[300px] bg-cyan-700/20 bottom-[10%] left-[5%] opacity-25" style={{ animationDelay: '1s' }} />

      {/* ── Subtle grid overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* ── Glass Card ── */}
      <div className="relative z-10 w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
            <span className="text-2xl">🚌</span>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">
            PMPML Predictor
          </h1>
          <p className="text-white/40 text-sm mt-1 font-medium tracking-wide">Pune Transit Intelligence Platform</p>
        </div>

        {/* Glass Card Body */}
        <div
          className="rounded-3xl p-8 border border-white/10 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
          }}
        >
          {/* ── Tab Toggle ── */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-8 border border-white/10">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                isSignIn
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                !isSignIn
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* ── Error / Success Banner ── */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium text-center flex items-center justify-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium text-center flex items-center justify-center gap-2">
              <span>✅</span> {successMsg}
            </div>
          )}

          {/* ── SIGN IN FORM ── */}
          {isSignIn && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <AuthInput
                id="signin-username"
                type="text"
                label="Username"
                value={signInForm.username}
                onChange={e => setSignInForm(p => ({ ...p, username: e.target.value }))}
                icon="👤"
                autoComplete="username"
              />
              <AuthInput
                id="signin-password"
                type="password"
                label="Password"
                value={signInForm.password}
                onChange={e => setSignInForm(p => ({ ...p, password: e.target.value }))}
                icon="🔒"
                autoComplete="current-password"
              />

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={loading}
                className="
                  w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white
                  bg-gradient-to-r from-indigo-600 to-purple-600
                  hover:from-indigo-500 hover:to-purple-500
                  active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                  shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>Sign In <span>→</span></>
                )}
              </button>

              <p className="text-center text-white/30 text-xs pt-2">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Create one free
                </button>
              </p>
            </form>
          )}

          {/* ── SIGN UP FORM ── */}
          {!isSignIn && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <AuthInput
                id="signup-username"
                type="text"
                label="Username"
                value={signUpForm.username}
                onChange={e => setSignUpForm(p => ({ ...p, username: e.target.value }))}
                icon="👤"
                autoComplete="username"
              />
              <AuthInput
                id="signup-email"
                type="email"
                label="Email address"
                value={signUpForm.email}
                onChange={e => setSignUpForm(p => ({ ...p, email: e.target.value }))}
                icon="✉️"
                autoComplete="email"
              />
              <AuthInput
                id="signup-password"
                type="password"
                label="Password (min 6 chars)"
                value={signUpForm.password}
                onChange={e => setSignUpForm(p => ({ ...p, password: e.target.value }))}
                icon="🔒"
                autoComplete="new-password"
              />
              <AuthInput
                id="signup-confirm"
                type="password"
                label="Confirm Password"
                value={signUpForm.confirm}
                onChange={e => setSignUpForm(p => ({ ...p, confirm: e.target.value }))}
                icon="🔑"
                autoComplete="new-password"
              />

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={loading}
                className="
                  w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white
                  bg-gradient-to-r from-indigo-600 to-purple-600
                  hover:from-indigo-500 hover:to-purple-500
                  active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                  shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account…
                  </>
                ) : (
                  <>Create Account <span>✦</span></>
                )}
              </button>

              <p className="text-center text-white/30 text-xs pt-2">
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-white/15 text-xs mt-6">
          🔐 Secured with JWT · Pune, India
        </p>
      </div>
    </div>
  )
}
