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
    throw new Error(data?.message || '请求失败，请稍后重试')
  }

  if (data && data.success === false) {
    throw new Error(data.message || '请求失败，请稍后重试')
  }

  return data
}

export function createComment(payload) {
  return requestJson('/api/comments', {
    method: 'POST',
    payload,
    token: getAccessToken(),
  })
}

export function fetchComments({ blogId, page = 1, size = 10, parentId, status } = {}) {
  return requestJson('/api/comments', {
    method: 'GET',
    query: { blogId, page, size, parentId, status },
  })
}

export function likeComment(commentId) {
  return requestJson(`/api/comments/${commentId}/like`, {
    method: 'POST',
    token: getAccessToken(),
  })
}

export function deleteComment(commentId) {
  return requestJson(`/api/comments/${commentId}`, {
    method: 'DELETE',
    token: getAccessToken(),
  })
}

export function fetchMyComments({ page = 1, size = 10 } = {}) {
  return requestJson('/api/comments/mine', {
    method: 'GET',
    token: getAccessToken(),
    query: { page, size },
  })
}

export function fetchAdminComments({ page = 1, size = 10, keyword, status, blogId } = {}) {
  return requestJson('/api/admin/comments', {
    method: 'GET',
    token: getAccessToken(),
    query: { page, size, keyword, status, blogId },
  })
}

export function reviewComment(commentId, status) {
  return requestJson(`/api/admin/comments/${commentId}/status`, {
    method: 'PATCH',
    token: getAccessToken(),
    payload: { status },
  })
}

export function adminDeleteComment(commentId) {
  return requestJson(`/api/admin/comments/${commentId}`, {
    method: 'DELETE',
    token: getAccessToken(),
  })
}

export function batchReviewComments(commentIds, status) {
  return requestJson('/api/admin/comments/batch-status', {
    method: 'PATCH',
    token: getAccessToken(),
    payload: { commentIds, status },
  })
}

export function fetchCommentStats(days = 30) {
  return requestJson('/api/admin/comments/stats', {
    method: 'GET',
    token: getAccessToken(),
    query: { days },
  })
}
