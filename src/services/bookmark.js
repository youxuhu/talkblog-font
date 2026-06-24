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
  try { data = await response.json() } catch { data = null }

  if (!response.ok) {
    throw new Error(data?.message || '请求失败')
  }
  if (data && data.success === false) {
    throw new Error(data.message || '请求失败')
  }
  return data
}

export function toggleBookmark(blogId) {
  return requestJson(`/api/bookmarks/${blogId}`, {
    method: 'POST',
    token: getAccessToken(),
  })
}

export function getBookmarkStatus(blogId) {
  return requestJson(`/api/bookmarks/${blogId}/status`, {
    method: 'GET',
    token: getAccessToken(),
  })
}

export function getBookmarkedBlogs({ page = 1, size = 10 } = {}) {
  return requestJson('/api/bookmarks', {
    method: 'GET',
    token: getAccessToken(),
    query: { page, size },
  })
}
