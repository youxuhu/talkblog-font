<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import { isAuthenticated } from '@/services/auth'

const router = useRouter()
const notificationStore = useNotificationStore()
const showDropdown = ref(false)
const loggedIn = ref(isAuthenticated())

const unreadCount = computed(() => notificationStore.unreadCount)

const previewList = computed(() =>
  notificationStore.notifications.slice(0, 10)
)

onMounted(() => {
  if (loggedIn.value) {
    notificationStore.connect()
  }
})

onUnmounted(() => {
  notificationStore.disconnect()
})

function toggleDropdown() {
  if (!loggedIn.value) return
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    notificationStore.fetchNotifications({ page: 1, size: 20 })
  }
}

function handleItemClick(notif) {
  if (!notif.read) {
    notificationStore.markAsRead(notif.id)
  }
  showDropdown.value = false
  if (notif.link) {
    router.push(notif.link)
  }
}

function handleMarkAllRead() {
  notificationStore.markAllAsRead()
}

function handleViewAll() {
  showDropdown.value = false
  router.push('/notifications')
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function typeIcon(type) {
  const map = {
    comment: '💬',
    reply: '💬',
    like: '👍',
    mention: '@',
    system: '🔔',
    blog_published: '📝',
    scheduled_publish: '⏰',
  }
  return map[type] || '🔔'
}
</script>

<template>
  <div v-if="loggedIn" class="notification-bell" @click.stop>
    <button class="bell-btn" @click="toggleDropdown">
      <svg class="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="unreadCount > 0" class="badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <div v-if="showDropdown" class="dropdown-backdrop" @click="showDropdown = false" />

    <transition name="dropdown-fade">
      <div v-if="showDropdown" class="dropdown">
        <div class="dropdown-header">
          <px-text size="14" weight="700">通知</px-text>
          <button v-if="unreadCount > 0" class="mark-all-btn" @click="handleMarkAllRead">
            全部已读
          </button>
        </div>

        <div class="dropdown-body" v-loading="notificationStore.loading">
          <div v-if="previewList.length === 0 && !notificationStore.loading" class="empty-tip">
            暂无通知
          </div>

          <div
            v-for="notif in previewList"
            :key="notif.id"
            :class="['notification-item', { unread: !notif.read }]"
            @click="handleItemClick(notif)"
          >
            <span class="notif-icon">{{ typeIcon(notif.type) }}</span>
            <div class="notif-content">
              <div class="notif-text">{{ notif.message }}</div>
              <div class="notif-time">{{ formatTime(notif.createdAt) }}</div>
            </div>
          </div>
        </div>

        <div class="dropdown-footer">
          <button class="view-all-btn" @click="handleViewAll">查看全部</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background 0.15s, color 0.15s;
}

.bell-btn:hover {
  background: var(--tag-bg);
  color: var(--color-accent);
}

.bell-icon {
  width: 22px;
  height: 22px;
}

.badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #e53e3e;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  border-radius: 9px;
  pointer-events: none;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 480px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--card-border);
}

.mark-all-btn {
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.mark-all-btn:hover {
  background: var(--color-accent-bg);
}

.dropdown-body {
  flex: 1;
  overflow-y: auto;
  min-height: 100px;
}

.empty-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--card-border);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background: var(--tag-bg);
}

.notification-item.unread {
  background: var(--color-accent-bg);
}

.notif-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-text {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.5;
  word-break: break-word;
}

.notif-time {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.dropdown-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--card-border);
  text-align: center;
}

.view-all-btn {
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;
  transition: background 0.15s;
}

.view-all-btn:hover {
  background: var(--color-accent-bg);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 640px) {
  .dropdown {
    width: 320px;
    right: -60px;
  }
}
</style>
