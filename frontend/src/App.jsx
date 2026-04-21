import { useState, useMemo, useEffect } from 'react'
import Auth from './Auth'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { CloudRain, Sun } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import 'leaflet-routing-machine'
import './App.css'

// IMPORTANT: Leaflet default icon fix
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

const STOP_COORDINATES = {
  // Existing Stops
  36156: { name: 'Pune Station', coords: [18.5284, 73.8737] },
  38709: { name: 'Hinjawadi', coords: [18.5913, 73.7389] },
  32: { name: 'Swargate', coords: [18.5018, 73.8636] },
  2052: { name: 'Katraj', coords: [18.4529, 73.8585] },

  // CSV Mock Data Stops
  101: { name: 'Shivaji Nagar', coords: [18.5314, 73.8446] },
  102: { name: 'Kothrud', coords: [18.5074, 73.8077] },
  103: { name: 'Viman Nagar', coords: [18.5679, 73.9143] },
  104: { name: 'Hadapsar', coords: [18.4966, 73.9416] },
  205: { name: 'Baner', coords: [18.5590, 73.7868] },
  301: { name: 'Wakad', coords: [18.5987, 73.7688] },
  405: { name: 'Magarpatta', coords: [18.5146, 73.9290] }
}

function RoutingControl({ origin, destination, prediction }) {
  const map = useMap()

  useEffect(() => {
    if (!origin || !destination) return

    let color = '#9333ea' // default purple
    if (prediction) {
      const predLower = String(prediction).toLowerCase()
      if (predLower.includes('smooth') || predLower.includes('light')) color = '#22c55e'
      else if (predLower.includes('moderate')) color = '#f59e0b'
      else if (predLower.includes('heavy') || predLower.includes('severe')) color = '#ef4444'
    }

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(origin.coords[0], origin.coords[1]),
        L.latLng(destination.coords[0], destination.coords[1])
      ],
      routeWhileDragging: false,
      showAlternatives: true,
      lineOptions: {
        styles: [{ color, weight: 6, opacity: 0.7 }]
      },
      createMarker: () => null,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: false
    }).addTo(map)

    return () => {
      try {
        map.removeControl(routingControl)
      } catch (e) {
        // ignore errors on unmount
      }
    }
  }, [map, origin, destination, prediction])

  return null
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-md w-full mx-auto p-8 relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 opacity-50"></div>
      {children}
    </div>
  )
}

function App() {
  // ── Auth State ────────────────────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('pmpml_token') || null)
  const savedUsername = localStorage.getItem('pmpml_username') || 'User'

  const handleLogout = () => {
    localStorage.removeItem('pmpml_token')
    localStorage.removeItem('pmpml_username')
    setToken(null)
  }
  // ─────────────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState({
    stop_id_from: '',
    stop_id_to: '',
    Hour_of_day: '8'
  })

  const [prediction, setPrediction] = useState(null)
  const [hourlyTrend, setHourlyTrend] = useState([])
  const [liveStatus, setLiveStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [weatherAlert, setWeatherAlert] = useState(null)
  const [isRaining, setIsRaining] = useState(false)

  // State to hold the confirmed route to display on the map
  const [activeRoute, setActiveRoute] = useState({ origin: null, destination: null })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPrediction(null)
    setHourlyTrend([])
    setLiveStatus(null)
    setWeatherAlert(null)
    setIsRaining(false)
    setActiveRoute({ origin: null, destination: null })

    try {
      const payload = {
        stop_id_from: Number(formData.stop_id_from),
        stop_id_to: Number(formData.stop_id_to),
        Hour_of_day: Number(formData.Hour_of_day)
      }

      const response = await axios.post('http://localhost:5000/predict', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPrediction(response.data.current_prediction)
      setHourlyTrend(response.data.hourly_trend)
      setLiveStatus(response.data.live_status)
      setWeatherAlert(response.data.weather_alert)
      setIsRaining(response.data.is_raining)

      // Set the active route for the map to display
      let oStop = STOP_COORDINATES[formData.stop_id_from]
      let dStop = STOP_COORDINATES[formData.stop_id_to]

      // Fallback logic for arbitrary non-dictionary IDs
      if (!oStop) {
        oStop = {
          name: `Stop ${formData.stop_id_from}`,
          coords: [18.5204 + (Math.random() * 0.05 - 0.025), 73.8567 + (Math.random() * 0.05 - 0.025)]
        }
      }
      if (!dStop) {
        dStop = {
          name: `Stop ${formData.stop_id_to}`,
          coords: [18.5204 + (Math.random() * 0.05 - 0.025), 73.8567 + (Math.random() * 0.05 - 0.025)]
        }
      }

      setActiveRoute({ origin: oStop, destination: dStop })

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error)
      } else {
        setError("Failed to reach the server. Make sure the backend is running.")
      }
    } finally {
      setLoading(false)
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getCongestionValue = (level) => {
    if (level === 'Heavy') return 3;
    if (level === 'Moderate') return 2;
    return 1;
  }

  const getCongestionColor = (level) => {
    if (level === 'Heavy') return '#ef4444'; // red-500
    if (level === 'Moderate') return '#eab308'; // yellow-500
    return '#10b981'; // emerald-500
  }

  const mapCenter = activeRoute.origin ? activeRoute.origin.coords : [18.5204, 73.8567] // Pune Default Center

  const originStop = activeRoute.origin
  const destStop = activeRoute.destination

  // ── Auth Gate ────────────────────────────────────────────────────────────
  if (!token) return <Auth onLogin={setToken} />
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 font-sans relative overflow-hidden text-gray-800">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>

      <div className="w-full max-w-6xl relative z-10 my-8">
        <div className="flex items-center justify-between mb-10">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">PMPML Predictor</h1>
            <p className="text-gray-500 font-medium">Predict congestion across transit routes instantly.</p>
          </div>
          <div className="flex items-center gap-3 absolute right-0">
            <span className="text-sm text-gray-500 font-medium hidden sm:inline">👤 {savedUsername}</span>
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md active:scale-95 transition-all duration-200"
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="col-span-1">
            <Card>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Origin Stop</label>
                    <select
                      name="stop_id_from"
                      required
                      value={formData.stop_id_from}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-white bg-gray-50 text-gray-800 cursor-pointer"
                    >
                      <option value="" disabled>Select Origin</option>
                      {Object.entries(STOP_COORDINATES).map(([id, stop]) => (
                        <option key={id} value={id}>{stop.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Destination Stop</label>
                    <select
                      name="stop_id_to"
                      required
                      value={formData.stop_id_to}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-white bg-gray-50 text-gray-800 cursor-pointer"
                    >
                      <option value="" disabled>Select Destination</option>
                      {Object.entries(STOP_COORDINATES).map(([id, stop]) => (
                        <option key={id} value={id}>{stop.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Hour of Day</label>
                  <select
                    name="Hour_of_day"
                    value={formData.Hour_of_day}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all hover:bg-white bg-gray-50 text-gray-800 cursor-pointer"
                  >
                    {hours.map(hour => (
                      <option key={hour} value={hour}>
                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transform transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Predicting...
                    </span>
                  ) : 'Predict Congestion'}
                </button>
              </form>

              {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center font-medium animate-pulse">
                  {error}
                </div>
              )}

              {prediction && !error && (
                <div className={`mt-6 p-6 rounded-xl text-center border shadow-sm transition-all duration-500
              ${String(prediction).toLowerCase().includes('heavy') ? 'bg-red-50 border-red-200 text-red-700' :
                    String(prediction).toLowerCase().includes('moderate') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                      'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  <p className="text-sm font-semibold uppercase tracking-wider mb-1 opacity-80">Predicted Congestion</p>
                  <p className="text-3xl font-extrabold">{prediction}</p>

                  {liveStatus && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-black/5 shadow-sm text-sm font-medium text-gray-800">
                      <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${liveStatus.includes('No live data') ? 'bg-gray-400' : 'bg-blue-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${liveStatus.includes('No live data') ? 'bg-gray-500' : 'bg-blue-500'}`}></span>
                      </span>
                      {liveStatus}
                    </div>
                  )}

                  {weatherAlert && (
                    <div className={`mt-4 p-4 rounded-lg border text-left shadow-sm flex items-start gap-3 transition-all duration-300
                      ${isRaining ? 'bg-blue-50 border-blue-200 text-blue-800 animate-pulse' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                      {isRaining ? <CloudRain className="w-6 h-6 flex-shrink-0 mt-0.5" /> : <Sun className="w-6 h-6 flex-shrink-0 mt-0.5" />}
                      <span className="text-sm font-medium leading-relaxed">{weatherAlert}</span>
                    </div>
                  )}
                </div>
              )}

              {hourlyTrend && hourlyTrend.length > 0 && !error && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 text-center">5-Hour Trend Analysis</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          hide={true}
                          domain={[0, 3]}
                        />
                        <Tooltip
                          cursor={{ fill: '#f3f4f6' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
                                  <p className="text-xs text-gray-500 font-semibold">{data.hour}</p>
                                  <p className="text-sm font-bold" style={{ color: getCongestionColor(data.congestion) }}>
                                    {data.congestion}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey={(entry) => getCongestionValue(entry.congestion)}
                          radius={[4, 4, 4, 4]}
                        >
                          {hourlyTrend.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getCongestionColor(entry.congestion)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Card>
          </div>
          <div className="col-span-1 lg:col-span-2">
            <div className="h-96 w-full rounded-xl shadow-lg border-2 border-purple-100 z-0 bg-white overflow-hidden flex items-center justify-center relative">
              <MapContainer center={mapCenter} zoom={11} className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {originStop && (
                  <Marker position={originStop.coords}>
                    <Popup>
                      <strong>Origin:</strong> {originStop.name} (ID: {formData.stop_id_from})
                    </Popup>
                  </Marker>
                )}

                {destStop && (
                  <Marker position={destStop.coords}>
                    <Popup>
                      <strong>Destination:</strong> {destStop.name} (ID: {formData.stop_id_to})
                    </Popup>
                  </Marker>
                )}

                <RoutingControl 
                  origin={originStop} 
                  destination={destStop} 
                  prediction={prediction} 
                />
              </MapContainer>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}

export default App
