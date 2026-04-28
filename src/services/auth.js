const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const AUTH_STORAGE_KEY = 'talkblog-auth-state'

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

export function registerByFace(payload) {
  return requestJson('/api/auth/register', { method: 'POST', payload })
}

export function loginByFace(payload) {
  return requestJson('/api/auth/login', { method: 'POST', payload })
}

export function loginByPassword(payload) {
  return requestJson('/api/auth/password-login', { method: 'POST', payload })
}

export function fetchAdminUsers({ page = 1, size = 10, keyword = '' } = {}, token) {
  return requestJson('/api/admin/users', {
    method: 'GET',
    token,
    query: { page, size, keyword },
  })
}

export function updateUserStatus(userId, status, token) {
  return requestJson(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    token,
    payload: { status },
  })
}

export function saveAuthState(authState) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState))
}

export function getAuthState() {
  const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearAuthState() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAccessToken() {
  return getAuthState()?.accessToken || ''
}

export function getCurrentUser() {
  return getAuthState()?.user || null
}

export function getCurrentRoles() {
  return getCurrentUser()?.roles || []
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}

export function isAdminUser() {
  return getCurrentRoles().some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(String(role).toUpperCase()))
}

export function decodeJwtPayload(token) {
  if (!token) {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}
