<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { clearAuthState, getCurrentUser, isAdminUser } from '@/services/auth'

const router = useRouter()
const user = computed(() => getCurrentUser())
const canEnterAdmin = computed(() => isAdminUser())

function goHome() {
  router.push('/')
}

function goAdmin() {
  router.push('/admin/users')
}

function goBlog() {
  router.push('/blogs')
}

function goAdminComments() {
  router.push('/admin/comments')
}

function goProfile() {
  router.push('/profile')
}

function goBookmarks() {
  router.push('/bookmarks')
}

function handleLogout() {
  clearAuthState()
  router.push('/')
}
</script>

<template>
  <main class="welcome-page">
    <div class="welcome-hero">
      <px-icon icon="check-solid" size="32" color="#2f855a" />
      <px-text tag="h1" size="22">欢迎回来</px-text>
      <px-text size="14" type="secondary">{{ user?.username || '用户' }}</px-text>
    </div>

    <div class="welcome-stats">
      <px-card stamp class="stat-card">
        <div class="stat-value">{{ user?.email || '-' }}</div>
        <px-text size="12" type="secondary">当前邮箱</px-text>
      </px-card>
      <px-card stamp class="stat-card">
        <div class="stat-value">{{ user?.roles?.join(' / ') || '未分配' }}</div>
        <px-text size="12" type="secondary">用户角色</px-text>
      </px-card>
      <px-card stamp class="stat-card">
        <div class="stat-value">{{ user?.loginType || 'UNKNOWN' }}</div>
        <px-text size="12" type="secondary">登录方式</px-text>
      </px-card>
    </div>

    <div class="module-section">
      <px-text tag="h2" size="16" class="section-title">功能入口</px-text>
      <div class="module-grid">
        <px-card hoverable class="module-card" @click="goBlog">
          <template #prepend>
            <px-icon icon="file-text-solid" size="24" color="#5d3ef0" />
          </template>
          <px-text tag="h3" size="14">博客列表</px-text>
          <px-text size="12" type="secondary">浏览所有博客文章</px-text>
        </px-card>

        <px-card hoverable class="module-card" @click="router.push('/series')">
          <template #prepend>
            <px-icon icon="folder-solid" size="24" color="#2f855a" />
          </template>
          <px-text tag="h3" size="14">文章专栏</px-text>
          <px-text size="12" type="secondary">系列文章合集</px-text>
        </px-card>

        <px-card hoverable class="module-card" @click="goBookmarks">
          <template #prepend>
            <px-icon icon="star-solid" size="24" color="#d69e2e" />
          </template>
          <px-text tag="h3" size="14">我的收藏</px-text>
          <px-text size="12" type="secondary">收藏的精彩内容</px-text>
        </px-card>

        <px-card hoverable class="module-card" @click="goProfile">
          <template #prepend>
            <px-icon icon="user-solid" size="24" color="#385b66" />
          </template>
          <px-text tag="h3" size="14">个人设置</px-text>
          <px-text size="12" type="secondary">账号与偏好设置</px-text>
        </px-card>

        <px-card hoverable class="module-card" @click="router.push('/chat')">
          <template #prepend>
            <px-icon icon="chat-solid" size="24" color="#7c4dff" />
          </template>
          <px-text tag="h3" size="14">聊天室</px-text>
          <px-text size="12" type="secondary">实时群组交流</px-text>
        </px-card>

        <px-card hoverable class="module-card" @click="router.push('/notifications')">
          <template #prepend>
            <px-icon icon="bell-solid" size="24" color="#e53e3e" />
          </template>
          <px-text tag="h3" size="14">通知中心</px-text>
          <px-text size="12" type="secondary">查看最新通知</px-text>
        </px-card>

        <div v-if="canEnterAdmin">
          <px-card hoverable class="module-card" @click="goAdmin">
            <template #prepend>
              <px-icon icon="settings-solid" size="24" color="#385b66" />
            </template>
            <px-text tag="h3" size="14">用户管理</px-text>
            <px-text size="12" type="secondary">管理用户账号</px-text>
          </px-card>
        </div>

        <div v-if="canEnterAdmin">
          <px-card hoverable class="module-card" @click="goAdminComments">
            <template #prepend>
              <px-icon icon="comment-solid" size="24" color="#5d3ef0" />
            </template>
            <px-text tag="h3" size="14">评论管理</px-text>
            <px-text size="12" type="secondary">审核管理评论</px-text>
          </px-card>
        </div>
      </div>
    </div>

    <div class="welcome-actions">
      <px-button type="primary" @click="goHome">返回首页</px-button>
      <px-button plain @click="handleLogout">退出登录</px-button>
    </div>
  </main>
</template>

<style scoped>
.welcome-page {
  min-height: 100vh;
  padding: 32px 24px;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.9), rgba(235, 230, 224, 0.92) 45%, rgba(193, 225, 193, 0.88)),
    linear-gradient(135deg, #f7f4ef, #ddebd7);
}

.welcome-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
}

.welcome-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  color: #213547;
  font-weight: 700;
  font-size: 14px;
  word-break: break-all;
  margin-bottom: 6px;
}

.section-title {
  margin-bottom: 6px;
  color: #385b66;
}

.module-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.module-card {
  cursor: pointer;
}

.welcome-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

@media (max-width: 640px) {
  .welcome-stats {
    grid-template-columns: 1fr;
  }

  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
