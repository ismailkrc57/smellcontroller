import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Monitor from './pages/Monitor'
import Collection from './pages/Collection'
import Training from './pages/Training'
import Detection from './pages/Detection'
import { useWebSocket } from './hooks/useWebSocket'
import './index.css'

export default function App() {
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
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar connectionStatus={connectionStatus} port={connectedPort} wsStatus={wsStatus} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard {...sharedProps} />} />
            <Route path="/monitor" element={<Monitor {...sharedProps} />} />
            <Route path="/collection" element={<Collection {...sharedProps} />} />
            <Route path="/training" element={<Training />} />
            <Route path="/detection" element={<Detection {...sharedProps} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
