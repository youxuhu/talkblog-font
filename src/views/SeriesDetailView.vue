<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import { isAuthenticated, getCurrentUser, isAdminUser } from '@/services/auth'
import { PxMessage } from '@mmt817/pixel-ui'

const route = useRoute()
const router = useRouter()
const seriesStore = useSeriesStore()

const seriesId = computed(() => route.params.id)
const series = computed(() => seriesStore.currentSeries)
const currentUser = computed(() => getCurrentUser())
const loggedIn = ref(isAuthenticated())
const deleting = ref(false)

onMounted(async () => {
  if (seriesId.value) {
    await seriesStore.fetchSeriesDetail(seriesId.value)
    seriesStore.fetchSeriesBlogs(seriesId.value, { page: 1, size: 20 })
  }
})

function goBack() {
  router.push('/series')
}

function goToBlog(blogId) {
  router.push(`/blog/${blogId}`)
}

function goToEditor() {
  router.push(`/series/editor/${seriesId.value}`)
}

function canEdit() {
  const s = series.value
  if (!s) return false
  return currentUser.value && currentUser.value.userId === s.authorId
}

function canDelete() {
  const s = series.value
  if (!s) return false
  if (isAdminUser()) return true
  return currentUser.value && currentUser.value.userId === s.authorId
}

async function handleDelete() {
  if (!confirm(`确定要删除专栏「${series.value?.name}」吗？此操作不可撤销。`)) return

  deleting.value = true
  try {
    await seriesStore.deleteSeries(seriesId.value)
    PxMessage.success('专栏已删除')
    router.push('/series')
  } catch (err) {
    PxMessage.error(err.message || '删除失败，请稍后重试')
  } finally {
    deleting.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<template>
  <main class="series-detail-page">
    <section class="page-header">
      <px-button plain @click="goBack">
        <template #prepend>
          <px-icon icon="arrow-left-solid" size="16" />
        </template>
        返回专栏
      </px-button>
      <div class="header-actions">
        <px-button v-if="canEdit()" type="primary" @click="goToEditor">
          <template #prepend>
            <px-icon icon="edit-solid" size="16" />
          </template>
          编辑专栏
        </px-button>
        <px-button v-if="canDelete()" type="danger" :loading="deleting" @click="handleDelete">
          <template #prepend>
            <px-icon icon="trash-solid" size="16" />
          </template>
          删除专栏
        </px-button>
      </div>
    </section>

    <px-card v-if="series" class="series-info-card" v-loading="seriesStore.loading">
      <template #header>
        <div class="series-header">
          <px-text tag="h1" size="22">{{ series.name }}</px-text>
          <px-text size="13" type="secondary">
            创建于 {{ formatDate(series.createdAt) }}
            <template v-if="series.blogCount !== undefined">
              · {{ series.blogCount }} 篇文章
            </template>
          </px-text>
        </div>
      </template>
      <div class="series-description">
        {{ series.description || '暂无描述' }}
      </div>
    </px-card>

    <div v-if="!series && !seriesStore.loading" class="empty-state">
      <px-icon icon="folder-open-solid" size="48" color="#b0bec5" />
      <px-text size="14" type="secondary">专栏不存在或已被删除</px-text>
      <px-button type="primary" @click="goBack">返回列表</px-button>
    </div>

    <section v-if="series" class="blog-list-section">
      <div class="section-header">
        <px-text tag="h2" size="18">专栏文章</px-text>
        <px-text size="13" type="secondary">共 {{ seriesStore.blogsTotal }} 篇</px-text>
      </div>

      <div v-if="seriesStore.seriesBlogs.length > 0" class="blog-list">
        <px-card
          v-for="blog in seriesStore.seriesBlogs"
          :key="blog.id"
          class="blog-card"
          @click="goToBlog(blog.id)"
        >
          <template #header>
            <div class="blog-card-header">
              <px-text tag="h3" size="16">{{ blog.title }}</px-text>
              <div class="blog-meta">
                <px-icon icon="user-solid" size="14" color="#6b7f87" />
                <px-text size="12" type="secondary">{{ blog.authorName || '匿名' }}</px-text>
                <px-icon icon="clock-regular" size="14" color="#6b7f87" />
                <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
              </div>
            </div>
          </template>
        </px-card>
      </div>

      <div v-else-if="!seriesStore.loading" class="empty-blogs">
        <px-text size="14" muted>该专栏暂无文章</px-text>
      </div>
    </section>
  </main>
</template>

<style scoped>
.series-detail-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  background:
    linear-gradient(180deg, rgba(247, 244, 239, 0.82), rgba(224, 235, 247, 0.82)),
    radial-gradient(circle at top left, #f9d8d6 0, transparent 28%),
    radial-gradient(circle at bottom right, #c7f0d8 0, transparent 24%),
    #ebe6e0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.series-info-card {
  margin-bottom: 32px;
}

.series-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.series-description {
  color: #385b66;
  line-height: 1.8;
  font-size: 15px;
  white-space: pre-wrap;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.12);
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blog-card {
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.blog-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.blog-card-header h3:hover {
  color: #5d3ef0;
}

.blog-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.empty-state,
.empty-blogs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
}

@media (max-width: 640px) {
  .series-detail-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
