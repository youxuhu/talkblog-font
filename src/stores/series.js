import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as seriesApi from '@/services/series'

export const useSeriesStore = defineStore('series', () => {
  const seriesList = ref([])
  const currentSeries = ref(null)
  const seriesBlogs = ref([])
  const total = ref(0)
  const blogsTotal = ref(0)
  const loading = ref(false)

  const hasMore = computed(() => seriesList.value.length < total.value)

  async function fetchSeriesList(options = {}) {
    const { page = 1, size = 20 } = options
    loading.value = true
    try {
      const result = await seriesApi.getSeriesList({ page, size })
      if (page === 1) {
        seriesList.value = result.data?.list || []
      } else {
        seriesList.value.push(...(result.data?.list || []))
      }
      total.value = result.data?.total || 0
    } finally {
      loading.value = false
    }
  }

  async function fetchSeriesDetail(seriesId) {
    loading.value = true
    try {
      const result = await seriesApi.getSeriesDetail(seriesId)
      currentSeries.value = result.data || null
      return result.data
    } finally {
      loading.value = false
    }
  }

  async function fetchSeriesBlogs(seriesId, options = {}) {
    const { page = 1, size = 10 } = options
    loading.value = true
    try {
      const result = await seriesApi.getSeriesBlogs(seriesId, { page, size })
      if (page === 1) {
        seriesBlogs.value = result.data?.list || []
      } else {
        seriesBlogs.value.push(...(result.data?.list || []))
      }
      blogsTotal.value = result.data?.total || 0
    } finally {
      loading.value = false
    }
  }

  async function createSeries(payload) {
    loading.value = true
    try {
      const result = await seriesApi.createSeries(payload)
      return result
    } finally {
      loading.value = false
    }
  }

  async function updateSeries(seriesId, payload) {
    loading.value = true
    try {
      const result = await seriesApi.updateSeries(seriesId, payload)
      if (currentSeries.value && currentSeries.value.id === seriesId) {
        currentSeries.value = { ...currentSeries.value, ...payload }
      }
      return result
    } finally {
      loading.value = false
    }
  }

  async function deleteSeries(seriesId) {
    loading.value = true
    try {
      const result = await seriesApi.deleteSeries(seriesId)
      seriesList.value = seriesList.value.filter((s) => s.id !== seriesId)
      return result
    } finally {
      loading.value = false
    }
  }

  function clearCurrentSeries() {
    currentSeries.value = null
    seriesBlogs.value = []
    blogsTotal.value = 0
  }

  function reset() {
    seriesList.value = []
    currentSeries.value = null
    seriesBlogs.value = []
    total.value = 0
    blogsTotal.value = 0
  }

  return {
    seriesList,
    currentSeries,
    seriesBlogs,
    total,
    blogsTotal,
    loading,
    hasMore,
    fetchSeriesList,
    fetchSeriesDetail,
    fetchSeriesBlogs,
    createSeries,
    updateSeries,
    deleteSeries,
    clearCurrentSeries,
    reset,
  }
})
