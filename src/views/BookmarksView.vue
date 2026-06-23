<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getBookmarkedBlogs } from '@/services/bookmark'
import { getCategoryLabel } from '@/config/categories'

const router = useRouter()
const blogs = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = 10

async function loadBookmarks() {
  loading.value = true
  try {
    const res = await getBookmarkedBlogs({ page: page.value, size })
    blogs.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function goToDetail(blogId) {
  router.push(`/blog/${blogId}`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

onMounted(loadBookmarks)
</script>

<template>
  <main class="bookmarks-page">
    <section class="page-header">
      <div class="header-left">
        <px-button plain @click="router.push('/welcome')">
          <px-icon icon="arrow-left-solid" size="16" /> 返回
        </px-button>
        <px-text tag="h1" size="20">我的收藏</px-text>
      </div>
    </section>

    <section class="blog-list" v-loading="loading">
      <px-card v-for="blog in blogs" :key="blog.id" class="blog-card">
        <template #header>
          <div class="blog-card-header" @click="goToDetail(blog.id)">
            <px-text tag="h3" size="16">{{ blog.title }}</px-text>
            <div class="blog-meta">
              <px-text size="12" type="secondary">{{ blog.authorName || '匿名' }}</px-text>
              <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
              <span v-if="blog.category" class="category-tag">{{ getCategoryLabel(blog.category) }}</span>
              <px-text size="12" type="secondary">{{ blog.viewCount ?? 0 }} 阅读</px-text>
            </div>
          </div>
        </template>
      </px-card>

      <div v-if="!loading && blogs.length === 0" class="empty-state">
        <px-text size="14" type="secondary">还没有收藏任何文章</px-text>
      </div>
    </section>
  </main>
</template>

<style scoped>
.bookmarks-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-page);
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

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blog-card {
  cursor: pointer;
}

.blog-card-header:hover h3 {
  color: var(--color-accent);
}

.blog-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.category-tag {
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-accent-bg);
  color: var(--color-accent);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}
</style>
