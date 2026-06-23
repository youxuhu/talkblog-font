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
  const { method = 'GET', payload, token, headers = {}, query } = options
  const url = buildUrl(path, query)
  const requestOptions = {
    method,
    headers: {
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  }
  if (payload) {
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

export function getSeriesList({ page = 1, size = 20 } = {}) {
  return requestJson('/api/series', {
    method: 'GET',
    query: { page, size },
  })
}

export function getSeriesDetail(seriesId) {
  return requestJson(`/api/series/${seriesId}`, {
    method: 'GET',
  })
}

export function createSeries(payload) {
  const token = getToken()
  return requestJson('/api/series', {
    method: 'POST',
    token,
    payload,
  })
}

export function updateSeries(seriesId, payload) {
  const token = getToken()
  return requestJson(`/api/series/${seriesId}`, {
    method: 'PUT',
    token,
    payload,
  })
}

export function deleteSeries(seriesId) {
  const token = getToken()
  return requestJson(`/api/series/${seriesId}`, {
    method: 'DELETE',
    token,
  })
}

export function getSeriesBlogs(seriesId, { page = 1, size = 10 } = {}) {
  return requestJson(`/api/series/${seriesId}/blogs`, {
    method: 'GET',
    query: { page, size },
  })
}
