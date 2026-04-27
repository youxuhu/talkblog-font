const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const LOGIN_SESSION_KEY = 'talkblog-face-login-email'

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data = null

  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error('服务暂时不可用，请稍后重试')
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || '请求失败，请稍后重试')
  }

  return data
}

export function registerByFace(payload) {
  return postJson('/api/auth/register', payload)
}

export function loginByFace(payload) {
  return postJson('/api/auth/login', payload)
}

export function saveLoginSession(email) {
  sessionStorage.setItem(LOGIN_SESSION_KEY, email)
}

export function getLoginSession() {
  return sessionStorage.getItem(LOGIN_SESSION_KEY)
}

export function clearLoginSession() {
  sessionStorage.removeItem(LOGIN_SESSION_KEY)
}
