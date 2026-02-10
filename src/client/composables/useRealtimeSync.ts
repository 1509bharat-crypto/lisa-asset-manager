import { ref, readonly, onUnmounted } from 'vue'

type EventCallback = () => void

const listeners: Record<string, Set<EventCallback>> = {}
let eventSource: EventSource | null = null
const connected = ref(false)

function connect() {
  if (eventSource) return

  eventSource = new EventSource('/api/events')

  eventSource.addEventListener('connected', () => {
    connected.value = true
  })

  eventSource.addEventListener('projects_changed', () => {
    notify('projects_changed')
  })

  eventSource.addEventListener('assets_changed', () => {
    notify('assets_changed')
  })

  eventSource.addEventListener('folders_changed', () => {
    notify('folders_changed')
  })

  eventSource.onerror = () => {
    connected.value = false
    // EventSource auto-reconnects, but reset state
    eventSource?.close()
    eventSource = null
    // Reconnect after 3 seconds
    setTimeout(connect, 3000)
  }
}

function notify(event: string) {
  const callbacks = listeners[event]
  if (callbacks) {
    for (const cb of callbacks) {
      cb()
    }
  }
}

export function useRealtimeSync() {
  // Start connection on first use
  connect()

  const on = (event: string, callback: EventCallback) => {
    if (!listeners[event]) {
      listeners[event] = new Set()
    }
    listeners[event].add(callback)

    // Clean up when component unmounts
    onUnmounted(() => {
      listeners[event]?.delete(callback)
    })
  }

  return {
    connected: readonly(connected),
    on
  }
}
