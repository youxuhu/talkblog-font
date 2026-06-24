<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBlogVersions } from '@/services/blogVersion'

const route = useRoute()
const router = useRouter()
const blogId = computed(() => route.params.id)

const versions = ref([])
const loading = ref(false)

async function loadVersions() {
  loading.value = true
  try {
    const res = await getBlogVersions(blogId.value, { page: 1, size: 50 })
    versions.value = res.data?.list || []
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(loadVersions)
</script>

<template>
  <main class="versions-page">
    <section class="page-header">
      <px-button plain @click="router.push(`/blog/${blogId}`)">
        <px-icon icon="arrow-left-solid" size="16" /> 返回
      </px-button>
      <px-text tag="h1" size="20">版本历史</px-text>
    </section>

    <section class="version-list" v-loading="loading">
      <px-card v-for="v in versions" :key="v.id" class="version-card">
        <template #header>
          <div class="version-header">
            <px-text tag="strong">v{{ v.version }}</px-text>
            <px-text size="12" type="secondary">{{ formatDate(v.createdAt) }}</px-text>
          </div>
        </template>
        <px-text tag="h4" size="14">{{ v.title }}</px-text>
        <px-text size="12" type="secondary" class="version-preview">
          {{ v.content?.substring(0, 200) }}...
        </px-text>
      </px-card>

      <div v-if="!loading && versions.length === 0" class="empty-state">
        <px-text size="14" type="secondary">暂无版本记录</px-text>
      </div>
    </section>
  </main>
</template>

<style scoped>
.versions-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-page);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-card {
  cursor: default;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.version-preview {
  margin-top: 8px;
  display: block;
  white-space: pre-wrap;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}
</style>
