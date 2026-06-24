<script setup>
import { useRouter } from 'vue-router'
import { isAuthenticated, getCurrentUser, isAdminUser } from '@/services/auth'

const router = useRouter()

const features = [
  { icon: 'file-text-solid', color: '#5d3ef0', title: '博客', desc: '阅读、创作与分享', route: '/blogs' },
  { icon: 'chat-solid', color: '#7c4dff', title: '聊天室', desc: '实时群组交流', route: '/chat' },
  { icon: 'star-solid', color: '#d69e2e', title: '收藏', desc: '收藏精彩内容', route: '/bookmarks' },
  { icon: 'bell-solid', color: '#e53e3e', title: '通知', desc: '实时消息提醒', route: '/notifications' },
  { icon: 'folder-solid', color: '#2f855a', title: '专栏', desc: '系列文章合集', route: '/series' },
  { icon: 'user-solid', color: '#385b66', title: '个人', desc: '账号与偏好设置', route: '/profile' },
]

function go(path) {
  if (path === '/chat' || path === '/bookmarks' || path === '/notifications' || path === '/profile') {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
  }
  router.push(path)
}
</script>

<template>
  <main class="portal-page">
    <section class="hero-section">
      <div class="hero-content">
        <px-icon icon="pixel-logo" size="48" color="#7c4dff" v-if="false" />
        <px-text tag="h1" size="28" class="hero-title">TalkBlog</px-text>
        <px-text size="14" type="secondary" class="hero-subtitle">
          一个现代化的博客与社交平台
        </px-text>
        <div class="hero-actions">
          <px-button v-if="!isAuthenticated()" type="primary" size="large" @click="router.push('/login')">
            开始使用
          </px-button>
          <px-button v-else type="primary" size="large" @click="router.push('/welcome')">
            进入控制台
          </px-button>
          <px-button v-if="!isAuthenticated()" plain size="large" @click="router.push('/')">
            了解更多
          </px-button>
        </div>
      </div>
    </section>

    <section class="features-section">
      <px-text tag="h2" size="20" class="section-title">平台功能</px-text>
      <px-text size="13" type="secondary" class="section-desc">
        探索 TalkBlog 提供的丰富功能
      </px-text>
      <div class="features-grid">
        <px-card
          v-for="f in features"
          :key="f.title"
          hoverable
          class="feature-card"
          @click="go(f.route)"
        >
          <template #prepend>
            <px-icon :icon="f.icon" size="28" :color="f.color" />
          </template>
          <px-text tag="h3" size="15">{{ f.title }}</px-text>
          <px-text size="12" type="secondary">{{ f.desc }}</px-text>
        </px-card>
      </div>
    </section>

    <section v-if="isAuthenticated()" class="quick-actions">
      <px-text tag="h2" size="20" class="section-title">快捷操作</px-text>
      <div class="quick-grid">
        <px-card hoverable class="quick-card" @click="router.push('/blog/editor')">
          <template #prepend>
            <px-icon icon="plus-solid" size="22" color="#5d3ef0" />
          </template>
          <px-text tag="h3" size="14">写博客</px-text>
          <px-text size="12" type="secondary">创建新文章</px-text>
        </px-card>
        <px-card hoverable class="quick-card" @click="router.push('/series/editor')">
          <template #prepend>
            <px-icon icon="plus-solid" size="22" color="#2f855a" />
          </template>
          <px-text tag="h3" size="14">创建专栏</px-text>
          <px-text size="12" type="secondary">整理系列文章</px-text>
        </px-card>
        <px-card v-if="isAdminUser()" hoverable class="quick-card" @click="router.push('/admin/comments')">
          <template #prepend>
            <px-icon icon="comment-solid" size="22" color="#7c4dff" />
          </template>
          <px-text tag="h3" size="14">审核评论</px-text>
          <px-text size="12" type="secondary">管理待审核内容</px-text>
        </px-card>
      </div>
    </section>

    <footer class="portal-footer">
      <px-text size="12" type="secondary">TalkBlog &copy; 2026</px-text>
    </footer>
  </main>
</template>

<style scoped>
.portal-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgba(247, 244, 239, 0.82), rgba(224, 235, 247, 0.82)),
    radial-gradient(circle at top left, #f9d8d6 0, transparent 28%),
    radial-gradient(circle at bottom right, #c7f0d8 0, transparent 24%),
    #ebe6e0;
}

.hero-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px 24px 60px;
}

.hero-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 600px;
}

.hero-title {
  color: #213547;
  letter-spacing: 0.04em;
}

.hero-subtitle {
  max-width: 400px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.features-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 24px;
}

.section-title {
  color: #385b66;
}

.section-desc {
  margin-bottom: 16px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  max-width: 900px;
  width: 100%;
}

.feature-card {
  cursor: pointer;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 24px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  max-width: 700px;
  width: 100%;
}

.quick-card {
  cursor: pointer;
}

.portal-footer {
  text-align: center;
  padding: 32px 24px;
  margin-top: auto;
}

@media (max-width: 640px) {
  .hero-section {
    padding: 48px 16px 32px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }
}
</style>
