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
    throw new Error(data?.message || '请求失败，请稍后重试')
  }

  if (data && data.success === false) {
    throw new Error(data.message || '请求失败，请稍后重试')
  }

  return data
}

export function fetchChatrooms({ page = 1, size = 10, keyword = '' } = {}, token) {
  return requestJson('/api/admin/chatrooms', {
    method: 'GET',
    token,
    query: { page, size, keyword },
  })
}

export function fetchChatroomById(chatroomId, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}`, {
    method: 'GET',
    token,
  })
}

export function createChatroom(payload, token) {
  return requestJson('/api/admin/chatrooms', {
    method: 'POST',
    token,
    payload,
  })
}

export function updateChatroom(chatroomId, payload, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}`, {
    method: 'PUT',
    token,
    payload,
  })
}

export function deleteChatroom(chatroomId, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}`, {
    method: 'DELETE',
    token,
  })
}

export function fetchChatroomMembers(chatroomId, { page = 1, size = 50, keyword = '' } = {}, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}/members`, {
    method: 'GET',
    token,
    query: { page, size, keyword },
  })
}

export function addChatroomMember(chatroomId, payload, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}/members`, {
    method: 'POST',
    token,
    payload,
  })
}

export function removeChatroomMember(chatroomId, userId, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}/members/${userId}`, {
    method: 'DELETE',
    token,
  })
}

export function updateMemberRole(chatroomId, userId, payload, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}/members/${userId}`, {
    method: 'PATCH',
    token,
    payload,
  })
}

export function fetchChatroomStats(token) {
  return requestJson('/api/admin/chatrooms/stats', {
    method: 'GET',
    token,
  })
}

export function fetchChatroomDailyStats(chatroomId, { startDate, endDate } = {}, token) {
  return requestJson(`/api/admin/chatrooms/${chatroomId}/stats/daily`, {
    method: 'GET',
    token,
    query: { startDate, endDate },
  })
}

export function batchDeleteChatrooms(ids, token) {
  return Promise.all(ids.map(id => deleteChatroom(id, token)))
}

export function batchRemoveChatroomMembers(chatroomId, userIds, token) {
  return Promise.all(userIds.map(userId => removeChatroomMember(chatroomId, userId, token)))
}

export function batchUpdateChatroomMemberRoles(chatroomId, userIds, role, token) {
  return Promise.all(userIds.map(userId => updateMemberRole(chatroomId, userId, { role }, token)))
}