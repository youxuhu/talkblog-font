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

  // 收藏状态
  const favorites = ref([])
  const favoritesTotal = ref(0)
  const favoritedBlogIds = ref(new Set())

  const popularBlogs = ref([])
  const trendingBlogs = ref([])

  // 计算属性
  const hasMore = computed(() => blogs.value.length < total.value)

  // 获取博客列表
  async function fetchBlogs(options = {}) {
    const { page = 1, size = 10, keyword: kw = '', categoryId, tagId, sortBy } = options
    loading.value = true
    try {
      const result = await blogApi.getBlogList({ page, size, keyword: kw, categoryId, tagId, sortBy })
      const list = result.data?.list || []
      if (page === 1) {
        blogs.value = list
      } else {
        blogs.value.push(...list)
      }
      total.value = result.data?.total || 0
      currentPage.value = page
      pageSize.value = size
      keyword.value = kw
      // update favorited set from response
      list.forEach(b => {
        if (b.favorited) {
          favoritedBlogIds.value.add(b.id)
        } else {
          favoritedBlogIds.value.delete(b.id)
        }
      })
    } finally {
      loading.value = false
    }
  }

  // 获取博客详情
  async function fetchBlogDetail(blogId) {
    loading.value = true
    try {
      const result = await blogApi.getBlogDetail(blogId)
      const data = result.data || null
      currentBlog.value = data
      if (data) {
        if (data.favorited) {
          favoritedBlogIds.value.add(data.id)
        } else {
          favoritedBlogIds.value.delete(data.id)
        }
      }
      return data
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
      favoritedBlogIds.value.delete(blogId)
      return result
    } finally {
      loading.value = false
    }
  }

  // 切换点赞
  async function toggleLike(blogId) {
    const result = await blogApi.likeBlog(blogId)
    const { liked, likeCount } = result.data || {}
    // update currentBlog if on detail page
    if (currentBlog.value && currentBlog.value.id === blogId) {
      currentBlog.value.liked = liked
      currentBlog.value.likeCount = likeCount
    }
    // update blog in list
    const b = blogs.value.find(b => b.id === blogId)
    if (b) {
      b.liked = liked
      b.likeCount = likeCount
    }
    return result
  }

  // 切换收藏
  async function toggleFavorite(blogId) {
    const result = await blogApi.favoriteBlog(blogId)
    const { favorited } = result.data || {}
    if (favorited) {
      favoritedBlogIds.value.add(blogId)
    } else {
      favoritedBlogIds.value.delete(blogId)
    }
    // update currentBlog if on detail page
    if (currentBlog.value && currentBlog.value.id === blogId) {
      currentBlog.value.favorited = favorited
    }
    // update blog in list
    const b = blogs.value.find(b => b.id === blogId)
    if (b) {
      b.favorited = favorited
    }
    return result
  }

  // 获取收藏列表
  async function fetchFavorites(options = {}) {
    const { page = 1, size = 10 } = options
    loading.value = true
    try {
      const result = await blogApi.getFavoriteBlogs({ page, size })
      favorites.value = result.data?.list || []
      favoritesTotal.value = result.data?.total || 0
      return result
    } finally {
      loading.value = false
    }
  }

  // 获取热门文章
  async function fetchPopular(limit = 5) {
    try {
      const result = await blogApi.getPopular(limit)
      popularBlogs.value = result.data || []
      return result
    } catch {
      popularBlogs.value = []
    }
  }

  // 获取趋势文章
  async function fetchTrending(days = 7, limit = 5) {
    try {
      const result = await blogApi.getTrending(days, limit)
      trendingBlogs.value = result.data || []
      return result
    } catch {
      trendingBlogs.value = []
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
    favorites.value = []
    favoritesTotal.value = 0
    favoritedBlogIds.value = new Set()
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
    favorites,
    favoritesTotal,
    favoritedBlogIds,
    popularBlogs,
    trendingBlogs,
    fetchBlogs,
    fetchBlogDetail,
    createBlog,
    updateBlog,
    deleteBlog,
    toggleLike,
    toggleFavorite,
    fetchFavorites,
    fetchPopular,
    fetchTrending,
    clearCurrentBlog,
    resetBlogs,
  }
})
