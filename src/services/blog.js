/**
 * 博客 API 服务层
 * 封装与后端博客接口的 HTTP 通信
 */

import { getAccessToken } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * 构建带查询参数的 URL
 */
function buildUrl(path, query = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

/**
 * 统一请求方法
 */
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

/**
 * 获取 Token
 */
function getToken() {
  return getAccessToken()
}

/**
 * 获取博客列表
 */
export function getBlogList({ page = 1, size = 10, keyword = '' } = {}) {
  return requestJson('/api/blogs', {
    method: 'GET',
    query: { page, size, keyword },
  })
}

/**
 * 获取博客详情
 */
export function getBlogDetail(blogId) {
  return requestJson(`/api/blogs/${blogId}`, {
    method: 'GET',
  })
}

/**
 * 创建博客
 */
export function createBlog(payload) {
  const token = getToken()
  return requestJson('/api/blogs', {
    method: 'POST',
    token,
    payload,
  })
}

/**
 * 更新博客
 */
export function updateBlog(blogId, payload) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}`, {
    method: 'PUT',
    token,
    payload,
  })
}

/**
 * 删除博客
 */
export function deleteBlog(blogId) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}`, {
    method: 'DELETE',
    token,
  })
}

/**
 * 获取我的博客
 */
export function getMyBlogs({ page = 1, size = 10 } = {}) {
  const token = getToken()
  return requestJson('/api/blogs/my', {
    method: 'GET',
    token,
    query: { page, size },
  })
}