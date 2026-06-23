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

async function requestJson(path, { method = 'GET', token, query } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

export function getBlogVersions(blogId, { page = 1, size = 10 } = {}) {
  return requestJson(`/api/blogs/${blogId}/versions`, {
    method: 'GET',
    query: { page, size },
  })
}
