import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getCategoryTree } from '@/services/category'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref([])
  const loading = ref(false)

  const flatCategories = computed(() => {
    function flatten(list) {
      const result = []
      for (const item of list) {
        result.push(item)
        if (item.children?.length) {
          result.push(...flatten(item.children))
        }
      }
      return result
    }
    return flatten(categories.value)
  })

  async function fetchCategories() {
    loading.value = true
    try {
      const res = await getCategoryTree()
      categories.value = res?.data || []
    } finally {
      loading.value = false
    }
  }

  return { categories, flatCategories, loading, fetchCategories }
})
