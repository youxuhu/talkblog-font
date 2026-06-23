import { getAccessToken } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws') || ''

function buildUrl(path, query = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

async function requestJson(path, options = {}) {
  const { method = 'GET', payload, token, headers = {}, query } = options
  const url = buildUrl(path, query)
  const requestOptions = {
    method,
    headers: {
      ...(method !== 'GET' && payload ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  }
  if (payload && method !== 'GET') {
    requestOptions.body = JSON.stringify(payload)
  }

  const response = await fetch(url, requestOptions)

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.message || '请求失败，请稍后重试')
  }

  if (data && data.success === false) {
    throw new Error(data.message || '请求失败，请稍后重试')
  }

  return data
}

function getToken() {
  return getAccessToken()
}

export function getNotifications({ page = 1, size = 20 } = {}) {
  const token = getToken()
  return requestJson('/api/notifications', {
    method: 'GET',
    token,
    query: { page, size },
  })
}

export function getUnreadCount() {
  const token = getToken()
  return requestJson('/api/notifications/unread-count', {
    method: 'GET',
    token,
  })
}

export function markAsRead(notificationId) {
  const token = getToken()
  return requestJson(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  })
}

export function markAllAsRead() {
  const token = getToken()
  return requestJson('/api/notifications/read-all', {
    method: 'PATCH',
    token,
  })
}

let ws = null
let reconnectTimer = null
let messageHandlers = []

export function onNotification(callback) {
  messageHandlers.push(callback)
  return () => {
    messageHandlers = messageHandlers.filter((h) => h !== callback)
  }
}

export function connectWebSocket() {
  const token = getToken()
  if (!token) return

  if (ws && ws.readyState === WebSocket.OPEN) return

  const wsUrl = `${WS_BASE_URL || window.location.origin.replace(/^http/, 'ws')}/ws/notifications?token=${token}`

  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        messageHandlers.forEach((handler) => handler(data))
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      ws = null
      if (getToken()) {
        reconnectTimer = setTimeout(() => connectWebSocket(), 5000)
      }
    }

    ws.onerror = () => {
      ws?.close()
    }
  } catch {
    // connection failed, retry later
    reconnectTimer = setTimeout(() => connectWebSocket(), 10000)
  }
}

export function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
  messageHandlers = []
}
