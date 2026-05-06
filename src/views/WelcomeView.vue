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

function goComments() {
  router.push('/blog/1/comments')
}

function goAdminComments() {
  router.push('/admin/comments')
}

function handleLogout() {
  clearAuthState()
  router.push('/')
}
</script>

<template>
  <main class="welcome-page">
    <px-card stamp class="welcome-card">
      <template #prepend>
        <px-icon icon="check-solid" size="28" color="#2f855a" />
      </template>
      <template #header>
        <div class="welcome-header">
          <px-text tag="h1" size="18">登录成功</px-text>
          <px-text size="12">当前会话已绑定 token</px-text>
        </div>
      </template>

      <div class="welcome-content">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ user?.username || '未找到' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">邮箱</span>
            <span class="info-value">{{ user?.email || '未找到' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">登录方式</span>
            <span class="info-value">{{ user?.loginType || 'UNKNOWN' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">角色</span>
            <span class="info-value">{{ user?.roles?.join(' / ') || '未分配' }}</span>
          </div>
        </div>

        <div class="session-tip">
          管理员可以进入用户管理页查看分页列表、搜索用户并切换账户状态。
        </div>

        <div class="module-grid">
          <div class="module-card" @click="goComments">
            <span class="module-icon">💬</span>
            <span class="module-label">博客评论</span>
          </div>
          <div v-if="canEnterAdmin" class="module-card" @click="goAdminComments">
            <span class="module-icon">📋</span>
            <span class="module-label">评论管理</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="welcome-actions">
          <px-button type="primary" @click="goHome">返回首页</px-button>
          <px-button v-if="canEnterAdmin" plain @click="goAdmin">用户管理</px-button>
          <px-button plain @click="handleLogout">退出登录</px-button>
        </div>
      </template>
    </px-card>
  </main>
</template>

<style scoped>
.welcome-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.9), rgba(235, 230, 224, 0.92) 45%, rgba(193, 225, 193, 0.88)),
    linear-gradient(135deg, #f7f4ef, #ddebd7);
}

.welcome-card {
  width: min(100%, 620px);
}

.welcome-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(56, 91, 102, 0.12);
  background: rgba(255, 255, 255, 0.72);
}

.info-label {
  font-size: 12px;
  color: #6b7f87;
}

.info-value {
  color: #213547;
  font-weight: 700;
  word-break: break-all;
}

.session-tip {
  padding: 16px;
  border-left: 4px solid #5d3ef0;
  background: rgba(93, 62, 240, 0.08);
  color: #385b66;
  line-height: 1.7;
}

.welcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(56, 91, 102, 0.12);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-color: rgba(93, 62, 240, 0.3);
}

.module-icon {
  font-size: 24px;
}

.module-label {
  color: #213547;
  font-weight: 600;
  font-size: 14px;
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
