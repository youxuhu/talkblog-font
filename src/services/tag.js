function buildUrl(path, query = {}) {
  const url = new URL(path, window.location.origin)
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

async function requestJson(path, { method = 'GET', payload, query } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  })
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok) {
    throw new Error(data?.message || data?.detail || '请求失败')
  }
  return data
}

export function searchTags(query) {
  return requestJson('/api/tags', { query: { q: query } })
}

export function getAllTags() {
  return requestJson('/api/tags')
}

export function createTag(payload) {
  return requestJson('/api/tags', {
    method: 'POST',
    payload,
  })
}

export function deleteTag(id) {
  return requestJson(`/api/tags/${id}`, {
    method: 'DELETE',
  })
}
