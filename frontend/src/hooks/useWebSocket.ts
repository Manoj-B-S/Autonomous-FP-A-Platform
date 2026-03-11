import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const { addAgentActivity, setConnected, addNotification } = useAppStore()

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    
    function connect() {
      try {
        const ws = new WebSocket(`${wsUrl}/ws`)
        wsRef.current = ws

        ws.onopen = () => {
          setConnected(true)
          ws.send('ping')
        }

        ws.onmessage = (e) => {
          if (e.data === 'pong') return
          try {
            const event = JSON.parse(e.data)
            if (event.type === 'agent_activity') {
              addAgentActivity({
                agent_name: event.data.agent || event.data.agent_name,
                company_id: event.data.company_id,
                action: event.data.action,
                status: event.data.status,
                timestamp: event.timestamp,
              })
              if (event.data.status === 'completed') {
                addNotification(`✅ ${event.data.agent}: ${event.data.action}`)
              }
            }
          } catch {}
        }

        ws.onclose = () => {
          setConnected(false)
          // Reconnect after 3s
          setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch (err) {
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
    }
  }, [])
}
