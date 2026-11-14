import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Monitor from './pages/Monitor'
import Collection from './pages/Collection'
import Training from './pages/Training'
import Detection from './pages/Detection'
import Login from './pages/Login'
import { useWebSocket } from './hooks/useWebSocket'
import { getSession } from './services/session'
import './index.css'

function DashboardShell() {
  const [sensorData, setSensorData] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('idle')
  const [connectedPort, setConnectedPort] = useState(null)

  const handleMessage = useCallback((msg) => {
    if (msg.type === 'sensor_data') {
      setSensorData(msg)
    } else if (msg.type === 'status') {
      setConnectionStatus(msg.connected ? msg.mode : 'idle')
      setConnectedPort(msg.port)
    }
  }, [])

  const { send, wsStatus } = useWebSocket(handleMessage)

  const sharedProps = { sensorData, connectionStatus, onSend: send, wsStatus }

  return (
    <div className="app-layout">
      <Sidebar connectionStatus={connectionStatus} port={connectedPort} wsStatus={wsStatus} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard {...sharedProps} />} />
          <Route path="/monitor" element={<Monitor {...sharedProps} />} />
          <Route path="/collection" element={<Collection {...sharedProps} />} />
          <Route path="/training" element={<Training />} />
          <Route path="/detection" element={<Detection {...sharedProps} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function RequireAuth({ children }) {
  const location = useLocation()
  if (!getSession()?.token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<RequireAuth><DashboardShell /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  )
}
