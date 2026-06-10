<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearAuthState, getCurrentUser, isAdminUser, isAuthenticated } from '@/services/auth'
import { useBlogStore } from '@/stores/blog'
import { ElMessage } from 'element-plus'

const router = useRouter()
const blogStore = useBlogStore()
const user = computed(() => getCurrentUser())
const canEnterAdmin = computed(() => isAdminUser())
const loggedIn = computed(() => isAuthenticated())

const activeTab = ref('profile')

onMounted(() => {
  blogStore.fetchFavorites({ page: 1, size: 10 })
})

function goHome() {
  router.push('/')
}

function goBlog() {
  router.push('/blogs')
}

function goAdmin() {
  router.push('/admin/users')
}

function handleLogout() {
  clearAuthState()
  blogStore.resetBlogs()
  router.push('/')
}

function goToDetail(blogId) {
  router.push(`/blog/${blogId}`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

async function handleRemoveFavorite(blogId) {
  try {
    await blogStore.toggleFavorite(blogId)
    blogStore.favorites = blogStore.favorites.filter(b => b.id !== blogId)
    blogStore.favoritesTotal--
    ElMessage.success('已取消收藏')
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}
</script>

<template>
  <main class="welcome-page">
    <div class="welcome-container">
      <div class="welcome-nav">
        <px-button plain @click="goHome">
          <template #prepend>
            <px-icon icon="arrow-left-solid" size="16" />
          </template>
          返回首页
        </px-button>
        <div class="nav-right">
          <px-button plain @click="goBlog">博客管理</px-button>
          <px-button v-if="canEnterAdmin" plain @click="goAdmin">进入后台</px-button>
          <px-button plain @click="handleLogout">退出登录</px-button>
        </div>
      </div>

      <px-card class="welcome-card">
        <el-tabs v-model="activeTab" class="welcome-tabs">
          <el-tab-pane label="个人信息" name="profile">
            <div class="profile-content">
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
            </div>
          </el-tab-pane>

          <el-tab-pane label="我的收藏" name="favorites">
            <div class="favorites-content">
              <div v-if="blogStore.favorites.length === 0 && !blogStore.loading" class="empty-favs">
                <px-text size="14" type="secondary">暂无收藏的博客</px-text>
              </div>
              <div v-else class="fav-list">
                <div
                  v-for="fav in blogStore.favorites"
                  :key="fav.id"
                  class="fav-item"
                  @click="goToDetail(fav.id)"
                >
                  <div class="fav-info">
                    <px-text tag="h3" size="15" class="fav-title">{{ fav.title }}</px-text>
                    <px-text size="12" type="secondary">
                      {{ fav.authorName || '匿名' }} · {{ formatDate(fav.createdAt) }}
                    </px-text>
                  </div>
                  <button class="fav-remove-btn" @click.stop="handleRemoveFavorite(fav.id)">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f1c40f" stroke="#f1c40f" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div v-if="blogStore.loading" class="loading-favs">
                <px-text size="12" type="secondary">加载中...</px-text>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </px-card>
    </div>
  </main>
</template>

<style scoped>
.welcome-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.9), rgba(235, 230, 224, 0.92) 45%, rgba(193, 225, 193, 0.88)),
    linear-gradient(135deg, #f7f4ef, #ddebd7);
}

.welcome-container {
  max-width: 700px;
  margin: 0 auto;
}

.welcome-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.nav-right {
  display: flex;
  gap: 8px;
}

.welcome-card {
  width: 100%;
}

.welcome-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 16px;
}

.welcome-tabs :deep(.el-tabs__content) {
  padding: 20px 16px;
}

.profile-content {
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

.favorites-content {
  min-height: 120px;
}

.empty-favs {
  text-align: center;
  padding: 60px 0;
}

.fav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(56, 91, 102, 0.1);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.fav-item:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(56, 91, 102, 0.2);
}

.fav-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.fav-title {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fav-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(56, 91, 102, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.fav-remove-btn:hover {
  background: rgba(241, 196, 15, 0.1);
  border-color: #f1c40f;
}

.loading-favs {
  text-align: center;
  padding: 40px 0;
}

@media (max-width: 640px) {
  .welcome-page {
    padding: 16px;
  }

  .welcome-nav {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
