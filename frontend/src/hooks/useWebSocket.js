import { useEffect, useRef, useCallback, useState } from 'react'

const WS_URL = 'ws://localhost:8000/ws/live'

export function useWebSocket(onMessage) {
  const ws = useRef(null)
  const onMessageRef = useRef(onMessage)
  const [status, setStatus] = useState('disconnected') // disconnected | connecting | connected

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    setStatus('connecting')
    ws.current = new WebSocket(WS_URL)

    ws.current.onopen = () => setStatus('connected')
    ws.current.onclose = () => setStatus('disconnected')
    ws.current.onerror = () => setStatus('disconnected')
    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessageRef.current?.(data)
      } catch {}
    }

    return () => {
      ws.current?.close()
    }
  }, [])

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    }
  }, [])

  return { send, status }
}
