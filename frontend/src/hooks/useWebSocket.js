import { useEffect, useRef, useCallback, useState } from 'react'

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/live'
const RECONNECT_DELAY = 2000

export function useWebSocket(onMessage) {
  const ws = useRef(null)
  const onMessageRef = useRef(onMessage)
  const reconnectTimer = useRef(null)
  const [wsStatus, setWsStatus] = useState('disconnected')

  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return
    if (ws.current && ws.current.readyState === WebSocket.CONNECTING) return

    setWsStatus('connecting')
    const socket = new WebSocket(WS_URL)
    ws.current = socket

    socket.onopen = () => {
      setWsStatus('connected')
      clearTimeout(reconnectTimer.current)
    }

    socket.onclose = () => {
      setWsStatus('disconnected')
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
    }

    socket.onerror = () => {
      setWsStatus('disconnected')
      socket.close()
    }

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessageRef.current?.(data)
      } catch {}
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  return { send, wsStatus }
}
