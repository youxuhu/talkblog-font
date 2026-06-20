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

async function requestJson(path, options = {}) {
  const { method = 'GET', payload, token, query } = options
  const url = buildUrl(path, query)
  const requestOptions = { method, headers: {} }
  if (payload) requestOptions.headers['Content-Type'] = 'application/json'
  if (token) requestOptions.headers['Authorization'] = `Bearer ${token}`
  if (payload) requestOptions.body = JSON.stringify(payload)

  const response = await fetch(url, requestOptions)
  let data = null
  try {
    data = await response.json()
  } catch { data = null }
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || `请求失败 (${response.status})`)
  }
  return data
}

export function getRecommendations({ page = 1, size = 10 } = {}) {
  const token = getAccessToken()
  return requestJson('/api/recommendations', {
    method: 'GET',
    query: { page, size },
    token,
  })
}
