import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getAllTags, searchTags } from '@/services/tag'

export const useTagStore = defineStore('tag', () => {
  const tags = ref([])
  const suggestions = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const res = await getAllTags()
      tags.value = res?.data || []
    } finally {
      loading.value = false
    }
  }

  async function search(query) {
    loading.value = true
    try {
      const res = await searchTags(query)
      suggestions.value = res?.data || []
    } finally {
      loading.value = false
    }
  }

  return { tags, suggestions, loading, fetchAll, search }
})
