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

export function getAccessToken() {
  const raw = sessionStorage.getItem('talkblog-auth-state')
  if (!raw) return null
  try {
    const auth = JSON.parse(raw)
    return auth?.accessToken || null
  } catch {
    return null
  }
}

export function getCurrentUser() {
  const raw = sessionStorage.getItem('talkblog-auth-state')
  if (!raw) return null
  try {
    const auth = JSON.parse(raw)
    return auth?.user || null
  } catch {
    return null
  }
}

export function isAdminUser() {
  const raw = sessionStorage.getItem('talkblog-auth-state')
  if (!raw) return false
  try {
    const auth = JSON.parse(raw)
    const roles = auth?.user?.roles || []
    return roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))
  } catch {
    return false
  }
}

export async function createChatGroup(payload, token) {
  return requestJson('/api/chat/groups', { method: 'POST', payload, token })
}

export async function getChatGroups(token) {
  return requestJson('/api/chat/groups', { method: 'GET', token })
}

export async function getChatGroup(groupId, token) {
  return requestJson(`/api/chat/groups/${groupId}`, { method: 'GET', token })
}

export async function joinGroup(groupId, token) {
  return requestJson(`/api/chat/groups/${groupId}/join`, { method: 'POST', token })
}

export async function leaveGroup(groupId, token) {
  return requestJson(`/api/chat/groups/${groupId}/leave`, { method: 'POST', token })
}

export async function getGroupMembers(groupId, token) {
  return requestJson(`/api/chat/groups/${groupId}/members`, { method: 'GET', token })
}

export async function getGroupMessages(groupId, { page = 1, size = 50 }, token) {
  return requestJson(`/api/chat/messages/${groupId}`, { method: 'GET', token, query: { page, size } })
}

export async function sendGroupMessage(groupId, payload, token) {
  return requestJson(`/api/chat/messages/${groupId}`, { method: 'POST', payload, token })
}

export async function deleteMessage(messageId, token) {
  return requestJson(`/api/chat/messages/${messageId}`, { method: 'DELETE', token })
}

export async function getAdminChatGroups({ page = 1, size = 10, keyword = '' }, token) {
  return requestJson('/api/admin/chat/groups', { method: 'GET', token, query: { page, size, keyword } })
}

export async function getAdminChatGroupDetail(groupId, token) {
  return requestJson(`/api/admin/chat/groups/${groupId}`, { method: 'GET', token })
}

export async function dismissChatGroup(groupId, token) {
  return requestJson(`/api/admin/chat/groups/${groupId}/dismiss`, { method: 'POST', token })
}

export async function banUserFromGroup(groupId, payload, token) {
  return requestJson(`/api/admin/chat/groups/${groupId}/ban`, { method: 'POST', payload, token })
}

export async function setGroupMemberRole(groupId, payload, token) {
  return requestJson(`/api/admin/chat/groups/${groupId}/set-admin`, { method: 'POST', payload, token })
}

export async function getAdminChatMessages({ page = 1, size = 20, keyword, groupId, userId }, token) {
  return requestJson('/api/admin/chat/messages', { method: 'GET', token, query: { page, size, keyword, groupId, userId } })
}

export async function adminDeleteMessage(messageId, token) {
  return requestJson(`/api/admin/chat/messages/${messageId}`, { method: 'DELETE', token })
}