<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'

const router = useRouter()
const notificationStore = useNotificationStore()

onMounted(() => {
  notificationStore.fetchNotifications({ page: 1, size: 50 })
})

function handleClick(notif) {
  if (!notif.read) {
    notificationStore.markAsRead(notif.id)
  }
  if (notif.link) {
    router.push(notif.link)
  }
}

function handleMarkAllRead() {
  notificationStore.markAllAsRead()
}

function handleLoadMore() {
  const nextPage = Math.floor(notificationStore.notifications.length / 20) + 1
  notificationStore.fetchNotifications({ page: nextPage, size: 20 })
}

function goBack() {
  router.back()
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
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
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
  <main class="notification-page">
    <section class="page-header">
      <div class="header-left">
        <px-button plain @click="goBack">
          <template #prepend>
            <px-icon icon="arrow-left-solid" size="16" />
          </template>
          返回
        </px-button>
        <px-text tag="h1" size="20">通知中心</px-text>
      </div>
      <px-button
        v-if="notificationStore.unreadCount > 0"
        plain
        size="small"
        @click="handleMarkAllRead"
      >
        全部已读
      </px-button>
    </section>

    <section class="notification-list" v-loading="notificationStore.loading">
      <div v-if="notificationStore.notifications.length === 0 && !notificationStore.loading" class="empty-state">
        <px-icon icon="bell-solid" size="48" color="#b0bec5" />
        <px-text size="14" type="secondary">暂无通知</px-text>
      </div>

      <div
        v-for="notif in notificationStore.notifications"
        :key="notif.id"
        :class="['notification-item', { unread: !notif.read }]"
        @click="handleClick(notif)"
      >
        <span class="notif-icon">{{ typeIcon(notif.type) }}</span>
        <div class="notif-body">
          <div class="notif-message">{{ notif.message }}</div>
          <div class="notif-time">{{ formatTime(notif.createdAt) }}</div>
        </div>
        <div v-if="!notif.read" class="unread-dot" />
      </div>

      <div v-if="notificationStore.hasMore" class="load-more">
        <px-button plain size="small" :loading="notificationStore.loading" @click="handleLoadMore">
          加载更多
        </px-button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.notification-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-page);
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  margin-bottom: 8px;
  position: relative;
}

.notification-item:hover {
  border-color: var(--color-accent);
  background: var(--tag-bg);
}

.notification-item.unread {
  border-left: 3px solid var(--color-accent);
}

.notif-icon {
  font-size: 22px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-message {
  font-size: 15px;
  color: var(--color-text-primary);
  line-height: 1.6;
  word-break: break-word;
}

.notif-time {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 6px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  flex-shrink: 0;
  margin-top: 8px;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 20px;
}

@media (max-width: 640px) {
  .notification-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
