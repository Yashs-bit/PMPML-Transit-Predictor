import { useState, useEffect, useRef } from 'react'
import Auth from './Auth'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { CloudRain, Sun, BotMessageSquare, X, Send, Loader2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'
import './App.css'

import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25,41], iconAnchor: [12,41] })
L.Marker.prototype.options.icon = DefaultIcon

// ── Stop Coordinates (unchanged) ─────────────────────────────────────────────
const STOP_COORDINATES = {
  36156: { name: 'Pune Station',  coords: [18.5284, 73.8737] },
  38709: { name: 'Hinjawadi',     coords: [18.5913, 73.7389] },
  32:    { name: 'Swargate',      coords: [18.5018, 73.8636] },
  2052:  { name: 'Katraj',        coords: [18.4529, 73.8585] },
  101:   { name: 'Shivaji Nagar', coords: [18.5314, 73.8446] },
  102:   { name: 'Kothrud',       coords: [18.5074, 73.8077] },
  103:   { name: 'Viman Nagar',   coords: [18.5679, 73.9143] },
  104:   { name: 'Hadapsar',      coords: [18.4966, 73.9416] },
  205:   { name: 'Baner',         coords: [18.5590, 73.7868] },
  301:   { name: 'Wakad',         coords: [18.5987, 73.7688] },
  405:   { name: 'Magarpatta',    coords: [18.5146, 73.9290] },
}

// ── Routing Control (logic unchanged) ────────────────────────────────────────
function RoutingControl({ origin, destination, prediction }) {
  const map = useMap()
  useEffect(() => {
    if (!origin || !destination) return
    let color = '#9333ea'
    if (prediction) {
      const p = String(prediction).toLowerCase()
      if (p.includes('smooth') || p.includes('light')) color = '#22c55e'
      else if (p.includes('moderate')) color = '#f59e0b'
      else if (p.includes('heavy') || p.includes('severe')) color = '#ef4444'
    }
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(origin.coords[0], origin.coords[1]), L.latLng(destination.coords[0], destination.coords[1])],
      routeWhileDragging: false, showAlternatives: true,
      lineOptions: { styles: [{ color, weight: 6, opacity: 0.8 }] },
      createMarker: () => null, addWaypoints: false, fitSelectedRoutes: true, show: false,
    }).addTo(map)
    return () => { try { map.removeControl(routingControl) } catch (e) {} }
  }, [map, origin, destination, prediction])
  return null
}

// ── Glass Card wrapper ────────────────────────────────────────────────────────
function GlassCard({ children, style }) {
  return (
    <div className="glass-card" style={{ padding: '28px', ...style }}>
      {children}
    </div>
  )
}

// ── Transit Assistant (AI Chat Widget) ───────────────────────────────────────
function TransitAssistant({ token }) {
  const [isOpen, setIsOpen]     = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m your PMPML Transit Assistant 🚌\nAsk me about routes, congestion, or travel tips in Pune!' }
  ])
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef           = useRef(null)
  const inputRef                 = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, isOpen])

  // Focus input when window opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 120)
  }, [isOpen])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isTyping) return

    // Append user message
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setIsTyping(true)

    try {
      const res = await axios.post(
        'http://localhost:5000/api/chat',
        { message: text },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const reply = res.data?.reply || res.data?.response || 'Sorry, I didn\'t get a response.'
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ Couldn\'t reach the assistant. Please check that the backend is running.',
        isError: true,
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <>
      {/* ── Chat Window ── */}
      <div className={`ta-window${isOpen ? ' ta-window--open' : ''}`} aria-hidden={!isOpen} role="dialog" aria-label="Transit Assistant">
        {/* Header */}
        <div className="ta-header">
          <div className="ta-header-info">
            <div className="ta-avatar">
              <BotMessageSquare size={18} />
            </div>
            <div>
              <p className="ta-header-title">Transit Assistant</p>
              <p className="ta-header-sub">Powered by AI · PMPML</p>
            </div>
          </div>
          <button id="ta-close-btn" className="ta-icon-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="ta-messages" role="log" aria-live="polite">
          {messages.map((msg, i) => (
            <div key={i} className={`ta-bubble-row ${msg.role === 'user' ? 'ta-bubble-row--user' : 'ta-bubble-row--bot'}`}>
              <div className={`ta-bubble${
                msg.role === 'user' ? ' ta-bubble--user' : ' ta-bubble--bot'
              }${msg.isError ? ' ta-bubble--error' : ''}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="ta-bubble-row ta-bubble-row--bot">
              <div className="ta-bubble ta-bubble--bot ta-bubble--typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Row */}
        <div className="ta-input-row">
          <input
            id="ta-chat-input"
            ref={inputRef}
            className="ta-input"
            type="text"
            placeholder="Ask about routes or congestion…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            aria-label="Chat message input"
          />
          <button
            id="ta-send-btn"
            className="ta-send-btn"
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            aria-label="Send message"
          >
            {isTyping
              ? <Loader2 size={16} className="ta-spin" />
              : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* ── Floating Trigger Button ── */}
      <button
        id="ta-trigger-btn"
        className={`ta-trigger${isOpen ? ' ta-trigger--active' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        aria-label="Toggle Transit Assistant"
        aria-expanded={isOpen}
      >
        <BotMessageSquare size={20} className="ta-trigger-icon" />
        <span className="ta-trigger-label">Transit Assistant</span>
      </button>
    </>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  // Auth State (unchanged)
  const [token, setToken] = useState(() => localStorage.getItem('pmpml_token') || null)
  const savedUsername = localStorage.getItem('pmpml_username') || 'User'
  const handleLogout = () => {
    localStorage.removeItem('pmpml_token')
    localStorage.removeItem('pmpml_username')
    setToken(null)
  }

  const [formData, setFormData]     = useState({ stop_id_from: '', stop_id_to: '', Hour_of_day: '8' })
  const [prediction, setPrediction] = useState(null)
  const [hourlyTrend, setHourlyTrend] = useState([])
  const [liveStatus, setLiveStatus] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [weatherAlert, setWeatherAlert] = useState(null)
  const [isRaining, setIsRaining]   = useState(false)
  const [activeRoute, setActiveRoute] = useState({ origin: null, destination: null })

  // ── Smart Suggestion Notification ────────────────────────────────────────
  const [showNotification, setShowNotification] = useState(false)
  const [isDismissing, setIsDismissing]         = useState(false)

  const handleDismissToast = () => {
    setIsDismissing(true)
    setTimeout(() => { setShowNotification(false); setIsDismissing(false) }, 340)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null); setPrediction(null)
    setHourlyTrend([]); setLiveStatus(null); setWeatherAlert(null)
    setIsRaining(false); setActiveRoute({ origin: null, destination: null })
    setShowNotification(false); setIsDismissing(false)
    try {
      const payload = {
        stop_id_from: Number(formData.stop_id_from),
        stop_id_to:   Number(formData.stop_id_to),
        Hour_of_day:  Number(formData.Hour_of_day),
      }
      const response = await axios.post('http://localhost:5000/predict', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const pred = response.data.current_prediction
      setPrediction(pred)
      // Trigger Smart Suggestion for Heavy congestion
      const predLow = String(pred).toLowerCase()
      if (predLow.includes('heavy') || predLow.includes('severe')) {
        setIsDismissing(false)
        setShowNotification(true)
      }
      setHourlyTrend(response.data.hourly_trend)
      setLiveStatus(response.data.live_status)
      setWeatherAlert(response.data.weather_alert)
      setIsRaining(response.data.is_raining)

      let oStop = STOP_COORDINATES[formData.stop_id_from]
      let dStop = STOP_COORDINATES[formData.stop_id_to]
      if (!oStop) oStop = { name:`Stop ${formData.stop_id_from}`, coords:[18.5204+(Math.random()*0.05-0.025),73.8567+(Math.random()*0.05-0.025)] }
      if (!dStop) dStop = { name:`Stop ${formData.stop_id_to}`,   coords:[18.5204+(Math.random()*0.05-0.025),73.8567+(Math.random()*0.05-0.025)] }
      setActiveRoute({ origin: oStop, destination: dStop })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reach the server. Make sure the backend is running.')
    } finally { setLoading(false) }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getCongestionValue = (level) => level==='Heavy'?3:level==='Moderate'?2:1
  const getCongestionColor = (level) => level==='Heavy'?'#ef4444':level==='Moderate'?'#eab308':'#10b981'

  const mapCenter   = activeRoute.origin ? activeRoute.origin.coords : [18.5204, 73.8567]
  const originStop  = activeRoute.origin
  const destStop    = activeRoute.destination

  const predLower   = prediction ? String(prediction).toLowerCase() : ''
  const resultClass = predLower.includes('heavy') ? 'heavy' : predLower.includes('moderate') ? 'moderate' : 'light'

  if (!token) return <Auth onLogin={setToken} />

  return (
    <div style={{ minHeight:'100vh', position:'relative', overflow:'hidden' }}>

      {/* ── Liquid Mesh Background (persistent) ── */}
      <div className="liquid-bg">
        <div className="liquid-orb orb-1" /><div className="liquid-orb orb-2" />
        <div className="liquid-orb orb-3" /><div className="liquid-orb orb-4" />
        <div className="liquid-orb orb-5" /><div className="grid-overlay" />
      </div>

      {/* ── Page Content ── */}
      <div style={{ position:'relative', zIndex:1, maxWidth:'1200px', margin:'0 auto', padding:'32px 20px 48px' }}>

        {/* ── Top Bar ── */}
        <div className="animate-slide-up" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'40px', flexWrap:'wrap', gap:'16px' }}>
          <div style={{ flex:1, minWidth:'200px' }}>
            <h1 style={{
              margin:'0 0 4px', fontSize:'clamp(1.6rem,4vw,2.4rem)', fontWeight:900, letterSpacing:'-0.03em',
              background:'linear-gradient(135deg,#c4b5fd 0%,#a5b4fc 45%,#f0abfc 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            }}>PMPML Predictor</h1>
            <p style={{ margin:0, color:'rgba(255,255,255,0.38)', fontSize:'0.85rem', fontWeight:500 }}>
              Predict congestion across Pune transit routes in real-time.
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.82rem', fontWeight:500 }}>👤 {savedUsername}</span>
            <button id="logout-btn" onClick={handleLogout} className="btn-logout">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:'28px', alignItems:'start' }}>

          {/* ── LEFT: Control Panel ── */}
          <div className="animate-slide-up">
            <GlassCard>
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>

                {/* Origin + Destination row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <div>
                    <label className="glass-label">Origin Stop</label>
                    <div className="input-icon-wrap">
                      <span className="icon">🟢</span>
                      <select name="stop_id_from" required value={formData.stop_id_from} onChange={handleChange} className="glass-input">
                        <option value="" disabled>Origin</option>
                        {Object.entries(STOP_COORDINATES).map(([id, stop]) => (
                          <option key={id} value={id}>{stop.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="glass-label">Destination</label>
                    <div className="input-icon-wrap">
                      <span className="icon">🔴</span>
                      <select name="stop_id_to" required value={formData.stop_id_to} onChange={handleChange} className="glass-input">
                        <option value="" disabled>Dest.</option>
                        {Object.entries(STOP_COORDINATES).map(([id, stop]) => (
                          <option key={id} value={id}>{stop.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Hour */}
                <div>
                  <label className="glass-label">Hour of Day</label>
                  <div className="input-icon-wrap">
                    <span className="icon">🕐</span>
                    <select name="Hour_of_day" value={formData.Hour_of_day} onChange={handleChange} className="glass-input">
                      {hours.map(h => (
                        <option key={h} value={h}>
                          {h===0?'12 AM':h<12?`${h} AM`:h===12?'12 PM':`${h-12} PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading} className="btn-glass-primary">
                  {loading ? (
                    <>
                      <svg className="animate-spin" style={{width:18,height:18}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Predicting…
                    </>
                  ) : '⚡ Predict Congestion'}
                </button>
              </form>

              {/* Error */}
              {error && (
                <div className="glass-alert-error" style={{marginTop:'18px'}}>
                  ⚠️ {error}
                </div>
              )}

              {/* Congestion Result */}
              {prediction && !error && (
                <div className={`result-glass ${resultClass}`} style={{marginTop:'20px'}}>
                  <p style={{margin:'0 0 4px',fontSize:'0.70rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.14em',opacity:0.65}}>
                    Predicted Congestion
                  </p>
                  <p style={{margin:0,fontSize:'2.2rem',fontWeight:900,letterSpacing:'-0.02em'}}>
                    {prediction}
                  </p>

                  {liveStatus && (
                    <div className="live-pill" style={{margin:'12px auto 0',width:'fit-content'}}>
                      <span style={{position:'relative',display:'flex',width:10,height:10}}>
                        <span style={{
                          position:'absolute',inset:0,borderRadius:'50%',opacity:0.75,
                          animation:'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
                          background: liveStatus.includes('No live data')?'#9ca3af':'#60a5fa'
                        }} />
                        <span style={{
                          position:'relative',display:'inline-flex',width:10,height:10,borderRadius:'50%',
                          background: liveStatus.includes('No live data')?'#6b7280':'#3b82f6'
                        }} />
                      </span>
                      {liveStatus}
                    </div>
                  )}

                  {weatherAlert && (
                    <div className={isRaining?'weather-alert-rain':'weather-alert-sun'}>
                      {isRaining ? <CloudRain style={{width:20,height:20,flexShrink:0,marginTop:2}} /> : <Sun style={{width:20,height:20,flexShrink:0,marginTop:2}} />}
                      <span>{weatherAlert}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Hourly Trend Chart */}
              {hourlyTrend?.length > 0 && !error && (
                <>
                  <hr className="glass-divider" />
                  <p className="section-title">5-Hour Trend Analysis</p>
                  <div style={{height:'180px',width:'100%'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyTrend} margin={{top:8,right:8,left:-24,bottom:0}}>
                        <XAxis dataKey="hour" tick={{fontSize:11,fill:'rgba(255,255,255,0.40)'}} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0,3]} />
                        <Tooltip
                          cursor={{fill:'rgba(255,255,255,0.04)'}}
                          content={({active,payload}) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div className="chart-tooltip">
                                <p style={{margin:'0 0 2px',fontSize:'0.72rem',color:'rgba(255,255,255,0.45)',fontWeight:600}}>{d.hour}</p>
                                <p style={{margin:0,fontSize:'0.9rem',fontWeight:700,color:getCongestionColor(d.congestion)}}>{d.congestion}</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey={e=>getCongestionValue(e.congestion)} radius={[6,6,6,6]}>
                          {hourlyTrend.map((entry,i) => (
                            <Cell key={`cell-${i}`} fill={getCongestionColor(entry.congestion)} opacity={0.85} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* ── RIGHT: Map ── */}
          <div className="animate-slide-up-delay" style={{height:'520px'}}>
            <div className="map-glass-wrapper" style={{height:'100%'}}>
              <MapContainer center={mapCenter} zoom={11} style={{height:'100%',width:'100%'}}>
              <TileLayer
  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
                {originStop && (
                  <Marker position={originStop.coords}>
                    <Popup><strong>Origin:</strong> {originStop.name} (ID: {formData.stop_id_from})</Popup>
                  </Marker>
                )}
                {destStop && (
                  <Marker position={destStop.coords}>
                    <Popup><strong>Destination:</strong> {destStop.name} (ID: {formData.stop_id_to})</Popup>
                  </Marker>
                )}
                <RoutingControl origin={originStop} destination={destStop} prediction={prediction} />
              </MapContainer>
            </div>
          </div>

        </div>
      </div>

      {/* ── Smart Suggestion Notification Toast ── */}
      {showNotification && (
        <div
          id="smart-suggestion-toast"
          className={`smart-toast${isDismissing ? ' dismissing' : ''}`}
          role="alert"
          aria-live="assertive"
        >
          <span className="smart-toast-icon">⚠️</span>
          <div className="smart-toast-body">
            <p className="smart-toast-title">Heavy Congestion Detected</p>
            <p className="smart-toast-msg">
              Smart Tip: Consider taking an alternate route or booking a ride-hailing
              service like <strong>Ola</strong> / <strong>Rapido</strong> to save time.
            </p>
          </div>
          <button
            id="toast-dismiss-btn"
            className="smart-toast-dismiss"
            onClick={handleDismissToast}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ping keyframe for live dot */}
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>

      {/* ── Transit Assistant Widget ── */}
      <TransitAssistant token={token} />
    </div>
  )
}

export default App
