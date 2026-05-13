/**
 * 博客状态管理（Pinia Store）
 * 集中管理博客相关的数据和操作
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as blogApi from '@/services/blog'

export const useBlogStore = defineStore('blog', () => {
  // 状态
  const blogs = ref([])
  const currentBlog = ref(null)
  const total = ref(0)
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const keyword = ref('')

  // 计算属性
  const hasMore = computed(() => blogs.value.length < total.value)

  // 获取博客列表
  async function fetchBlogs(options = {}) {
    const { page = 1, size = 10, keyword: kw = '' } = options
    loading.value = true
    try {
      const result = await blogApi.getBlogList({ page, size, keyword: kw })
      if (page === 1) {
        blogs.value = result.data?.list || []
      } else {
        blogs.value.push(...(result.data?.list || []))
      }
      total.value = result.data?.total || 0
      currentPage.value = page
      pageSize.value = size
      keyword.value = kw
    } finally {
      loading.value = false
    }
  }

  // 获取博客详情
  async function fetchBlogDetail(blogId) {
    loading.value = true
    try {
      const result = await blogApi.getBlogDetail(blogId)
      currentBlog.value = result.data || null
      return result.data
    } finally {
      loading.value = false
    }
  }

  // 创建博客
  async function createBlog(payload) {
    loading.value = true
    try {
      const result = await blogApi.createBlog(payload)
      return result
    } finally {
      loading.value = false
    }
  }

  // 更新博客
  async function updateBlog(blogId, payload) {
    loading.value = true
    try {
      const result = await blogApi.updateBlog(blogId, payload)
      if (currentBlog.value && currentBlog.value.id === blogId) {
        currentBlog.value = { ...currentBlog.value, ...payload }
      }
      return result
    } finally {
      loading.value = false
    }
  }

  // 删除博客
  async function deleteBlog(blogId) {
    loading.value = true
    try {
      const result = await blogApi.deleteBlog(blogId)
      blogs.value = blogs.value.filter((b) => b.id !== blogId)
      return result
    } finally {
      loading.value = false
    }
  }

  // 清空当前博客
  function clearCurrentBlog() {
    currentBlog.value = null
  }

  // 重置状态
  function resetBlogs() {
    blogs.value = []
    currentBlog.value = null
    total.value = 0
    currentPage.value = 1
    keyword.value = ''
  }

  return {
    blogs,
    currentBlog,
    total,
    loading,
    currentPage,
    pageSize,
    keyword,
    hasMore,
    fetchBlogs,
    fetchBlogDetail,
    createBlog,
    updateBlog,
    deleteBlog,
    clearCurrentBlog,
    resetBlogs,
  }
})