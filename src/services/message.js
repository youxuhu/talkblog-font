const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function buildUrl(path, query = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

async function requestJson(path, { method = 'GET', payload, token, headers = {}, query } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.message || '请求失败')
  }

  if (data && data.success === false) {
    throw new Error(data.message || '请求失败')
  }

  return data
}

export function fetchMyChatrooms(token) {
  return requestJson('/api/chatrooms/mine', {
    method: 'GET',
    token,
    query: { page: 1, size: 100 },
  })
}

export function fetchMessages(chatroomId, { page = 1, size = 50 } = {}, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/messages`, {
    method: 'GET',
    token,
    query: { page, size },
  })
}

export function sendMessage(chatroomId, payload, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/messages`, {
    method: 'POST',
    token,
    payload,
  })
}

export function recallMessage(chatroomId, messageId, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/messages/${messageId}/recall`, {
    method: 'PATCH',
    token,
  })
}

export function pinMessage(chatroomId, messageId, isPinned, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/messages/${messageId}/pin`, {
    method: 'PATCH',
    token,
    payload: { isPinned },
  })
}

export function deleteMessage(chatroomId, messageId, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/messages/${messageId}`, {
    method: 'DELETE',
    token,
  })
}

export function fetchMyRole(chatroomId, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/my-role`, {
    method: 'GET',
    token,
  })
}

export function transferOwnership(chatroomId, newOwnerId, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/transfer-ownership`, {
    method: 'POST',
    token,
    payload: { newOwnerId },
  })
}

export function muteMember(chatroomId, userId, durationMinutes, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/members/${userId}/mute`, {
    method: 'PATCH',
    token,
    payload: { durationMinutes },
  })
}

export function unmuteMember(chatroomId, userId, token) {
  return requestJson(`/api/chatrooms/${chatroomId}/members/${userId}/unmute`, {
    method: 'PATCH',
    token,
  })
}
