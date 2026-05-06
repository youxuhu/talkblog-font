<script setup>
/**
 * 博客详情页
 * 功能：展示单篇博客内容，支持编辑、返回
 */

import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()

// 从路由参数获取博客 ID
const blogId = computed(() => route.params.id)

// 获取当前博客数据
const blog = computed(() => blogStore.currentBlog)

// 组件挂载时获取博客详情
onMounted(() => {
  if (blogId.value) {
    blogStore.fetchBlogDetail(blogId.value)
  }
})

// 返回博客列表
function goBack() {
  router.push('/blogs')
}

// 跳转到编辑页
function goToEditor() {
  router.push(`/blog/editor/${blogId.value}`)
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <main class="blog-detail-page">
    <!-- 页面头部 -->
    <section class="page-header">
      <px-button plain @click="goBack">
        <template #prepend>
          <px-icon icon="arrow-left-solid" size="16" />
        </template>
        返回列表
      </px-button>
      <px-button type="primary" @click="goToEditor">
        <template #prepend>
          <px-icon icon="edit-solid" size="16" />
        </template>
        编辑
      </px-button>
    </section>

    <!-- 博客内容卡片 -->
    <px-card v-if="blog" class="blog-detail-card" v-loading="blogStore.loading">
      <template #header>
        <div class="blog-header">
          <!-- 博客标题 -->
          <px-text tag="h1" size="22">{{ blog.title }}</px-text>
          
          <!-- 元信息 -->
          <div class="blog-meta">
            <px-icon icon="user-solid" size="14" color="#6b7f87" />
            <px-text size="12" type="secondary">{{ blog.authorName || '匿名' }}</px-text>
            <px-icon icon="clock-regular" size="14" color="#6b7f87" />
            <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
            <template v-if="blog.updatedAt">
              <px-icon icon="edit-regular" size="14" color="#6b7f87" />
              <px-text size="12" type="secondary">更新于 {{ formatDate(blog.updatedAt) }}</px-text>
            </template>
          </div>
        </div>
      </template>

      <!-- 博客正文 -->
      <div class="blog-content">
        {{ blog.content }}
      </div>
    </px-card>

    <!-- 博客不存在时显示空状态 -->
    <div v-if="!blog && !blogStore.loading" class="empty-state">
      <px-icon icon="file-excel-solid" size="48" color="#b0bec5" />
      <px-text size="14" type="secondary">博客不存在或已被删除</px-text>
      <px-button type="primary" @click="goBack">返回列表</px-button>
    </div>
  </main>
</template>

<style scoped>
.blog-detail-page {
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

.blog-detail-card {
  width: 100%;
}

.blog-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.blog-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.blog-content {
  color: #385b66;
  line-height: 1.9;
  font-size: 16px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
}

@media (max-width: 640px) {
  .blog-detail-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .blog-content {
    font-size: 15px;
  }
}
</style>