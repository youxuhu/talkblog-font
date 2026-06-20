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
export function getBlogList({ page = 1, size = 10, keyword = '', categoryId, tagId, sortBy } = {}) {
  const token = getToken()
  return requestJson('/api/blogs', {
    method: 'GET',
    token,
    query: { page, size, keyword, categoryId, tagId, sortBy },
  })
}

/**
 * 获取博客详情
 */
export function getBlogDetail(blogId) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}`, {
    method: 'GET',
    token,
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
 * 上传博客图片
 */
export async function uploadBlogImage(file) {
  const token = getToken()
  if (!token) {
    throw new Error('请先登录后再上传图片')
  }
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(buildUrl('/api/blogs/upload-image'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    throw new Error('图片上传失败（服务器响应异常）')
  }

  if (!response.ok) {
    throw new Error(data?.message || '图片上传失败')
  }

  if (data && data.success === false) {
    throw new Error(data.message || '图片上传失败')
  }

  return data
}

/**
 * 删除博客图片
 */
export async function deleteBlogImage(imageUrl) {
  const token = getToken()
  if (!token) {
    throw new Error('请先登录')
  }
  return requestJson('/api/blogs/upload-image', {
    method: 'DELETE',
    token,
    query: { url: imageUrl },
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

/**
 * 点赞/取消点赞博客
 */
export function likeBlog(blogId) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}/like`, {
    method: 'POST',
    token,
  })
}

/**
 * 收藏/取消收藏博客
 */
export function favoriteBlog(blogId) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}/favorite`, {
    method: 'POST',
    token,
  })
}

/**
 * 获取收藏的博客列表
 */
export function getFavoriteBlogs({ page = 1, size = 10 } = {}) {
  const token = getToken()
  return requestJson('/api/blogs/favorites', {
    method: 'GET',
    token,
    query: { page, size },
  })
}

/**
 * 记录博客阅读
 */
export function recordView(blogId) {
  return requestJson(`/api/blogs/${blogId}/view`, {
    method: 'POST',
  })
}

/**
 * 获取热门文章
 */
export function getPopular(limit = 10) {
  const token = getToken()
  return requestJson('/api/blogs/popular', {
    method: 'GET',
    token,
    query: { limit },
  })
}

/**
 * 获取趋势文章
 */
export function getTrending(days = 7, limit = 10) {
  const token = getToken()
  return requestJson('/api/blogs/trending', {
    method: 'GET',
    token,
    query: { days, limit },
  })
}

/**
 * 获取点赞用户列表
 */
export function getUsersWhoLiked(blogId, page = 1, size = 20) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}/likes/users`, {
    method: 'GET',
    token,
    query: { page, size },
  })
}

/**
 * 获取收藏用户列表
 */
export function getUsersWhoFavorited(blogId, page = 1, size = 20) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}/favorites/users`, {
    method: 'GET',
    token,
    query: { page, size },
  })
}

/**
 * 获取浏览用户列表
 */
export function getUsersWhoViewed(blogId, page = 1, size = 20) {
  const token = getToken()
  return requestJson(`/api/blogs/${blogId}/views/users`, {
    method: 'GET',
    token,
    query: { page, size },
  })
}