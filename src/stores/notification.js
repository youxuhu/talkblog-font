import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as notificationApi from '@/services/notification'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const total = ref(0)
  const loading = ref(false)
  const wsConnected = ref(false)

  const hasMore = computed(() => notifications.value.length < total.value)

  async function fetchNotifications(options = {}) {
    const { page = 1, size = 20 } = options
    loading.value = true
    try {
      const result = await notificationApi.getNotifications({ page, size })
      if (page === 1) {
        notifications.value = result.data?.list || []
      } else {
        notifications.value.push(...(result.data?.list || []))
      }
      total.value = result.data?.total || 0
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const result = await notificationApi.getUnreadCount()
      unreadCount.value = result.data?.count || 0
    } catch {
      // ignore
    }
  }

  async function markAsRead(notificationId) {
    try {
      await notificationApi.markAsRead(notificationId)
      const notif = notifications.value.find((n) => n.id === notificationId)
      if (notif) notif.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      // ignore
    }
  }

  async function markAllAsRead() {
    try {
      await notificationApi.markAllAsRead()
      notifications.value.forEach((n) => (n.read = true))
      unreadCount.value = 0
    } catch {
      // ignore
    }
  }

  function connect() {
    notificationApi.onNotification((data) => {
      if (data.type === 'new_notification') {
        notifications.value.unshift(data.notification)
        total.value += 1
        unreadCount.value += 1
      }
    })
    notificationApi.connectWebSocket()
    wsConnected.value = true
    fetchUnreadCount()
  }

  function disconnect() {
    notificationApi.disconnectWebSocket()
    wsConnected.value = false
  }

  return {
    notifications,
    unreadCount,
    total,
    loading,
    wsConnected,
    hasMore,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    connect,
    disconnect,
  }
})
