<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import { isAuthenticated } from '@/services/auth'

const router = useRouter()
const seriesStore = useSeriesStore()
const loggedIn = ref(isAuthenticated())

onMounted(() => {
  seriesStore.fetchSeriesList({ page: 1, size: 50 })
})

function goToDetail(seriesId) {
  router.push(`/series/${seriesId}`)
}

function goToEditor(seriesId = null) {
  router.push(`/series/editor${seriesId ? `/${seriesId}` : ''}`)
}

function goBack() {
  router.push('/blogs')
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
  <main class="series-list-page">
    <section class="page-header">
      <div class="header-left">
        <px-button plain @click="goBack">
          <template #prepend>
            <px-icon icon="arrow-left-solid" size="16" />
          </template>
          返回
        </px-button>
        <div class="header-content">
          <px-text tag="h1" size="20">文章专栏</px-text>
          <px-text size="12" type="secondary">浏览所有专栏系列</px-text>
        </div>
      </div>
      <px-button v-if="loggedIn" type="primary" @click="goToEditor()">
        <template #prepend>
          <px-icon icon="plus-solid" size="16" />
        </template>
        创建专栏
      </px-button>
    </section>

    <section class="series-grid" v-loading="seriesStore.loading">
      <template v-if="seriesStore.seriesList.length > 0">
        <px-card
          v-for="series in seriesStore.seriesList"
          :key="series.id"
          class="series-card"
          @click="goToDetail(series.id)"
        >
          <template #header>
            <div class="series-card-header">
              <px-text tag="h3" size="16">{{ series.name }}</px-text>
              <px-text v-if="series.blogCount !== undefined" size="12" type="secondary">
                {{ series.blogCount }} 篇文章
              </px-text>
            </div>
          </template>
          <div class="series-description">
            {{ series.description || '暂无描述' }}
          </div>
          <template #footer>
            <div class="series-footer">
              <px-text size="12" type="secondary">
                创建于 {{ formatDate(series.createdAt) }}
              </px-text>
              <px-icon icon="arrow-right-solid" size="14" color="#6b7f87" />
            </div>
          </template>
        </px-card>
      </template>

      <div v-else-if="!seriesStore.loading" class="empty-state">
        <px-icon icon="folder-open-solid" size="48" color="#b0bec5" />
        <px-text size="14" type="secondary">暂无专栏</px-text>
        <px-button v-if="loggedIn" type="primary" @click="goToEditor()">创建第一个专栏</px-button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.series-list-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 1200px;
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

.header-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.series-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.series-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.series-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.series-description {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 3em;
}

.series-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .series-list-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .series-grid {
    grid-template-columns: 1fr;
  }
}
</style>
