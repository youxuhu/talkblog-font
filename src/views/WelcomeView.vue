<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { clearLoginSession, getLoginSession } from '@/services/auth'

const router = useRouter()
const email = computed(() => getLoginSession())

function goHome() {
  router.push('/')
}

function handleLogout() {
  clearLoginSession()
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
          <px-text tag="h1" size="18">Face Login Complete</px-text>
          <px-text size="12">像素门禁已经放行</px-text>
        </div>
      </template>

      <div class="welcome-content">
        <px-text size="13">当前登录邮箱</px-text>
        <div class="welcome-email">{{ email || '未找到本次会话信息' }}</div>
        <px-text size="12">后端当前未返回 token，本页仅展示本次登录结果。</px-text>
      </div>

      <template #footer>
        <div class="welcome-actions">
          <px-button type="primary" @click="goHome">返回首页</px-button>
          <px-button plain @click="handleLogout">清除会话</px-button>
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
  width: min(100%, 520px);
}

.welcome-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 0;
}

.welcome-email {
  padding: 16px;
  border: 2px dashed #385b66;
  background: rgba(255, 255, 255, 0.72);
  color: #213547;
  word-break: break-all;
}

.welcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
