import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getRecommendations } from '@/services/recommend'
import { useBlogStore } from './blog'

export const useRecommendStore = defineStore('recommend', () => {
  const recommendations = ref([])
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const loading = ref(false)

  const hasMore = computed(() => recommendations.value.length < total.value)

  async function fetchRecommendations(options = {}) {
    const { page = 1, size = 10 } = options
    loading.value = true
    try {
      const result = await getRecommendations({ page, size })
      const list = result.data?.list || []
      if (page === 1) {
        recommendations.value = list
      } else {
        recommendations.value.push(...list)
      }
      total.value = result.data?.total || 0
      currentPage.value = page
      pageSize.value = size

      const blogStore = useBlogStore()
      list.forEach(b => {
        if (b.favorited) blogStore.favoritedBlogIds.add(b.id)
      })
    } finally {
      loading.value = false
    }
  }

  function reset() {
    recommendations.value = []
    total.value = 0
    currentPage.value = 1
    loading.value = false
  }

  return { recommendations, total, currentPage, pageSize, loading, hasMore, fetchRecommendations, reset }
})
