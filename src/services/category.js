import { getAccessToken } from './auth'

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

async function requestJson(path, { method = 'GET', payload, token, query } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export function getCategoryTree() {
  return requestJson('/api/categories')
}

export function getCategoryList() {
  return requestJson('/api/categories/flat')
}

export function createCategory(payload) {
  return requestJson('/api/categories', {
    method: 'POST',
    token: getAccessToken(),
    payload,
  })
}

export function updateCategory(id, payload) {
  return requestJson(`/api/categories/${id}`, {
    method: 'PUT',
    token: getAccessToken(),
    payload,
  })
}

export function deleteCategory(id) {
  return requestJson(`/api/categories/${id}`, {
    method: 'DELETE',
    token: getAccessToken(),
  })
}
