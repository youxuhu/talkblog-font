import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'talkblog-theme'

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(getInitialTheme() === 'dark')

  function applyTheme() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function toggle() {
    isDark.value = !isDark.value
  }

  watch(isDark, (val) => {
    localStorage.setItem(STORAGE_KEY, val ? 'dark' : 'light')
    applyTheme()
  }, { immediate: true })

  return { isDark, toggle }
})
