import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as authService from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  const authState = ref(authService.getAuthState())
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(authState.value?.accessToken))
  const currentUser = computed(() => authState.value?.user || null)
  const currentRoles = computed(() => currentUser.value?.roles || [])
  const isAdmin = computed(() =>
    currentRoles.value.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(String(role).toUpperCase()))
  )
  const accessToken = computed(() => authState.value?.accessToken || '')

  function updateAuthState(state) {
    authState.value = state
    if (state) {
      authService.saveAuthState(state)
    } else {
      authService.clearAuthState()
    }
  }

  async function register(payload) {
    loading.value = true
    try {
      const result = await authService.registerByFace(payload)
      return result
    } finally {
      loading.value = false
    }
  }

  async function loginByFace(payload) {
    loading.value = true
    try {
      const result = await authService.loginByFace(payload)
      return result
    } finally {
      loading.value = false
    }
  }

  async function loginByPassword(payload) {
    loading.value = true
    try {
      const result = await authService.loginByPassword(payload)
      return result
    } finally {
      loading.value = false
    }
  }

  function logout() {
    updateAuthState(null)
  }

  return {
    authState,
    loading,
    isAuthenticated,
    currentUser,
    currentRoles,
    isAdmin,
    accessToken,
    updateAuthState,
    register,
    loginByFace,
    loginByPassword,
    logout,
  }
})
