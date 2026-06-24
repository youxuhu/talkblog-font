<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PxMessage } from '@mmt817/pixel-ui'
import { ElMessage } from 'element-plus'
import { getCurrentUser, updateProfile, changePassword, uploadAvatar, isAdminUser, saveAuthState, getAuthState } from '@/services/auth'

const router = useRouter()
const currentUser = computed(() => getCurrentUser())
const isAdmin = computed(() => isAdminUser())

const uploadingAvatar = ref(false)
const avatarPreview = ref(currentUser.value?.avatarUrl || null)
const fileInput = ref(null)

async function handleAvatarUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    ElMessage.warning('只支持 JPEG/PNG/GIF/WebP 格式')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过 5MB')
    return
  }
  uploadingAvatar.value = true
  try {
    const res = await uploadAvatar(file)
    const avatarUrl = res?.data || URL.createObjectURL(file)
    avatarPreview.value = avatarUrl
    const state = getAuthState()
    if (state?.user) {
      state.user.avatarUrl = avatarUrl
      saveAuthState(state)
    }
    PxMessage.success('头像上传成功')
  } catch (err) {
    ElMessage.error(err.message || '上传失败')
  } finally {
    uploadingAvatar.value = false
    e.target.value = ''
  }
}

function triggerFileSelect() {
  fileInput.value?.click()
}

const profileForm = reactive({
  username: currentUser.value?.username || '',
})
const savingProfile = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const savingPassword = ref(false)

async function handleUpdateProfile() {
  if (!profileForm.username.trim()) {
    PxMessage.warning('用户名不能为空')
    return
  }
  savingProfile.value = true
  try {
    await updateProfile({ username: profileForm.username.trim() })
    PxMessage.success('资料更新成功，重新登录后生效')
  } catch (err) {
    PxMessage.error(err.message || '更新失败')
  } finally {
    savingProfile.value = false
  }
}

async function handleChangePassword() {
  if (!passwordForm.oldPassword) {
    PxMessage.warning('请输入当前密码')
    return
  }
  if (!passwordForm.newPassword) {
    PxMessage.warning('请输入新密码')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    PxMessage.warning('新密码至少 6 位')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    PxMessage.warning('两次输入的新密码不一致')
    return
  }
  savingPassword.value = true
  try {
    await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (err) {
    ElMessage.error(err.message || '修改失败')
  } finally {
    savingPassword.value = false
  }
}

function goBack() {
  router.push('/welcome')
}
</script>

<template>
  <main class="profile-page">
    <section class="page-header">
      <px-button plain @click="goBack">
        <template #prepend>
          <px-icon icon="arrow-left-solid" size="16" />
        </template>
        返回
      </px-button>
      <px-text tag="h1" size="18">个人设置</px-text>
    </section>

    <div class="profile-grid">
      <px-card stamp class="profile-card">
        <template #prepend>
          <px-icon icon="user-solid" size="26" color="#7c4dff" />
        </template>
        <template #header>
          <px-text tag="h2" size="16">个人资料</px-text>
        </template>

        <div class="avatar-section">
          <div class="avatar-wrapper" @click="triggerFileSelect">
            <img
              v-if="avatarPreview"
              :src="avatarPreview"
              class="avatar-img"
              alt="头像"
            />
            <div v-else class="avatar-placeholder">
              <px-icon icon="user-solid" size="32" color="#b0bec5" />
            </div>
            <div class="avatar-overlay">
              <px-icon icon="camera-solid" size="18" color="#fff" />
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style="display: none"
            @change="handleAvatarUpload"
          />
          <px-text size="12" type="secondary">点击更换头像（JPEG/PNG/GIF/WebP，最大 5MB）</px-text>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">邮箱</span>
            <span class="info-value">{{ currentUser?.email || '未设置' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">角色</span>
            <span class="info-value">{{ currentUser?.roles?.join(' / ') || '未分配' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">登录方式</span>
            <span class="info-value">{{ currentUser?.loginType || 'UNKNOWN' }}</span>
          </div>
        </div>

        <div class="form-section">
          <label class="field-block">
            <span class="field-label">用户名</span>
            <px-input v-model="profileForm.username" placeholder="输入新用户名" clearable />
          </label>
          <px-button type="primary" :loading="savingProfile" :use-throttle="false" @click="handleUpdateProfile">
            保存资料
          </px-button>
        </div>
      </px-card>

      <px-card stamp class="profile-card">
        <template #prepend>
          <px-icon icon="lock-solid" size="26" color="#7c4dff" />
        </template>
        <template #header>
          <px-text tag="h2" size="16">修改密码</px-text>
        </template>

        <div class="form-section">
          <label class="field-block">
            <span class="field-label">当前密码</span>
            <px-input
              v-model="passwordForm.oldPassword"
              type="password"
              placeholder="输入当前密码"
              show-password
            />
          </label>
          <label class="field-block">
            <span class="field-label">新密码</span>
            <px-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="输入新密码（至少 6 位）"
              show-password
            />
          </label>
          <label class="field-block">
            <span class="field-label">确认新密码</span>
            <px-input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="再次输入新密码"
              show-password
            />
          </label>
          <px-button type="primary" :loading="savingPassword" :use-throttle="false" @click="handleChangePassword">
            修改密码
          </px-button>
        </div>
      </px-card>

      <px-card stamp class="profile-card">
        <template #prepend>
          <px-icon icon="settings-solid" size="26" color="#7c4dff" />
        </template>
        <template #header>
          <px-text tag="h2" size="16">个性化</px-text>
        </template>
        <px-text size="12" type="secondary">更多个性化设置即将推出</px-text>
      </px-card>
    </div>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  background: var(--bg-page);
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.profile-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-card {
  width: 100%;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
}

.info-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.info-value {
  color: var(--color-text-primary);
  font-weight: 700;
  word-break: break-all;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: var(--color-text-secondary);
  font-size: 0.92rem;
  font-weight: 700;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.avatar-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--card-border);
  transition: border-color 0.15s;
}

.avatar-wrapper:hover {
  border-color: var(--color-accent);
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tag-bg);
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.15s;
}

@media (max-width: 640px) {
  .profile-page {
    padding: 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
