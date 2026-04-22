import { useState } from 'react'
import axios from 'axios'

function AuthInput({ id, type, label, value, onChange, icon, autoComplete }) {
  return (
    <div className="input-icon-wrap">
      <span className="icon">{icon}</span>
      <input
        id={id} type={type} value={value} onChange={onChange}
        placeholder={label} autoComplete={autoComplete} required
        className="glass-input"
      />
    </div>
  )
}

export default function Auth({ onLogin }) {
  const [mode, setMode]             = useState('signin')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [signInForm, setSignInForm] = useState({ username: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const isSignIn = mode === 'signin'

  const switchMode = (m) => { setError(null); setSuccessMsg(null); setMode(m) }

  const handleSignIn = async (e) => {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/login', {
        username: signInForm.username, password: signInForm.password,
      })
      localStorage.setItem('pmpml_token', res.data.access_token)
      localStorage.setItem('pmpml_username', res.data.username)
      onLogin(res.data.access_token)
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.')
    } finally { setLoading(false) }
  }

  const handleSignUp = async (e) => {
    e.preventDefault(); setError(null)
    if (signUpForm.password !== signUpForm.confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/register', {
        username: signUpForm.username, email: signUpForm.email, password: signUpForm.password,
      })
      localStorage.setItem('pmpml_token', res.data.access_token)
      localStorage.setItem('pmpml_username', res.data.username)
      onLogin(res.data.access_token)
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  const Spinner = () => (
    <svg className="animate-spin" style={{ width: 18, height: 18 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', overflow:'hidden' }}>
      {/* Liquid Mesh Background */}
      <div className="liquid-bg">
        <div className="liquid-orb orb-1" /><div className="liquid-orb orb-2" />
        <div className="liquid-orb orb-3" /><div className="liquid-orb orb-4" />
        <div className="liquid-orb orb-5" /><div className="grid-overlay" />
      </div>

      <div className="animate-slide-up" style={{ position:'relative', zIndex:10, width:'100%', maxWidth:'420px' }}>
        {/* Brand Header */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'72px', height:'72px', borderRadius:'22px', fontSize:'2rem', marginBottom:'18px',
            background:'linear-gradient(135deg,#6d28d9,#4f46e5,#7c3aed)',
            boxShadow:'0 12px 40px rgba(109,40,217,0.55),inset 0 1px 0 rgba(255,255,255,0.25)',
          }}>🚌</div>
          <h1 style={{
            margin:'0 0 6px', fontSize:'2rem', fontWeight:900, letterSpacing:'-0.02em',
            background:'linear-gradient(135deg,#c4b5fd,#a5b4fc,#f0abfc)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          }}>PMPML Predictor</h1>
          <p style={{ margin:0, color:'rgba(255,255,255,0.35)', fontSize:'0.82rem', fontWeight:500, letterSpacing:'0.05em' }}>
            Pune Transit Intelligence Platform
          </p>
        </div>

        {/* Glass Card */}
        <div className="glass-card" style={{ padding:'32px' }}>
          {/* Tab Toggle */}
          <div className="glass-tab-bar">
            <button type="button" className={`glass-tab${isSignIn?' active':''}`} onClick={() => switchMode('signin')}>Sign In</button>
            <button type="button" className={`glass-tab${!isSignIn?' active':''}`} onClick={() => switchMode('signup')}>Create Account</button>
          </div>

          {error     && <div className="glass-alert-error"   style={{marginBottom:'20px'}}><span>⚠️</span> {error}</div>}
          {successMsg && <div className="glass-alert-success" style={{marginBottom:'20px'}}><span>✅</span> {successMsg}</div>}

          {/* Sign In Form */}
          {isSignIn && (
            <form onSubmit={handleSignIn} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div><label className="glass-label">Username</label>
                <AuthInput id="signin-username" type="text" label="Enter your username"
                  value={signInForm.username} onChange={e => setSignInForm(p=>({...p,username:e.target.value}))} icon="👤" autoComplete="username" />
              </div>
              <div><label className="glass-label">Password</label>
                <AuthInput id="signin-password" type="password" label="Enter your password"
                  value={signInForm.password} onChange={e => setSignInForm(p=>({...p,password:e.target.value}))} icon="🔒" autoComplete="current-password" />
              </div>
              <button id="signin-submit-btn" type="submit" disabled={loading} className="btn-glass-primary" style={{marginTop:'8px'}}>
                {loading ? <><Spinner /> Signing in…</> : <>Sign In <span style={{fontSize:'1.1rem'}}>→</span></>}
              </button>
              <p style={{textAlign:'center',color:'rgba(255,255,255,0.28)',fontSize:'0.78rem',marginTop:'8px'}}>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => switchMode('signup')} style={{background:'none',border:'none',color:'#a5b4fc',fontWeight:700,cursor:'pointer',fontSize:'inherit',padding:0}}>Create one free</button>
              </p>
            </form>
          )}

          {/* Sign Up Form */}
          {!isSignIn && (
            <form onSubmit={handleSignUp} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div><label className="glass-label">Username</label>
                <AuthInput id="signup-username" type="text" label="Choose a username"
                  value={signUpForm.username} onChange={e => setSignUpForm(p=>({...p,username:e.target.value}))} icon="👤" autoComplete="username" />
              </div>
              <div><label className="glass-label">Email Address</label>
                <AuthInput id="signup-email" type="email" label="your@email.com"
                  value={signUpForm.email} onChange={e => setSignUpForm(p=>({...p,email:e.target.value}))} icon="✉️" autoComplete="email" />
              </div>
              <div><label className="glass-label">Password</label>
                <AuthInput id="signup-password" type="password" label="Min 6 characters"
                  value={signUpForm.password} onChange={e => setSignUpForm(p=>({...p,password:e.target.value}))} icon="🔒" autoComplete="new-password" />
              </div>
              <div><label className="glass-label">Confirm Password</label>
                <AuthInput id="signup-confirm" type="password" label="Repeat your password"
                  value={signUpForm.confirm} onChange={e => setSignUpForm(p=>({...p,confirm:e.target.value}))} icon="🔑" autoComplete="new-password" />
              </div>
              <button id="signup-submit-btn" type="submit" disabled={loading} className="btn-glass-primary" style={{marginTop:'8px'}}>
                {loading ? <><Spinner /> Creating account…</> : <>Create Account <span style={{fontSize:'1rem'}}>✦</span></>}
              </button>
              <p style={{textAlign:'center',color:'rgba(255,255,255,0.28)',fontSize:'0.78rem',marginTop:'8px'}}>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')} style={{background:'none',border:'none',color:'#a5b4fc',fontWeight:700,cursor:'pointer',fontSize:'inherit',padding:0}}>Sign in</button>
              </p>
            </form>
          )}
        </div>

        <p style={{textAlign:'center',color:'rgba(255,255,255,0.15)',fontSize:'0.72rem',marginTop:'20px'}}>
          🔐 Secured with JWT · Pune, India
        </p>
      </div>
    </div>
  )
}
