<script setup>
/**
 * 博客列表页
 * 功能：展示所有已发布博客，支持搜索、删除，返回首页
 */

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { PxMessage } from '@mmt817/pixel-ui'

const router = useRouter()
const blogStore = useBlogStore()

// 搜索关键词
const searchKeyword = ref('')

// 加载更多博客
function loadMore() {
  const nextPage = blogStore.currentPage + 1
  blogStore.fetchBlogs({ page: nextPage, keyword: searchKeyword.value })
}

// 组件挂载时获取博客列表
onMounted(() => {
  blogStore.fetchBlogs({ page: 1, keyword: '' })
})

// 搜索博客
function handleSearch() {
  blogStore.fetchBlogs({ page: 1, keyword: searchKeyword.value })
}

// 跳转到博客详情页
function goToDetail(blogId) {
  router.push(`/blog/${blogId}`)
}

// 跳转到博客编辑页（新建或编辑）
function goToEditor(blogId = null) {
  router.push(`/blog/editor${blogId ? `/${blogId}` : ''}`)
}

// 返回首页
function goHome() {
  router.push('/')
}

// 删除博客
function handleDelete(blog) {
  if (!confirm(`确定要删除博客「${blog.title}」吗？`)) {
    return
  }
  blogStore.deleteBlog(blog.id).then(() => {
    PxMessage.success('删除成功')
  }).catch((err) => {
    PxMessage.error(err.message || '删除失败')
  })
}

// 格式化日期
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
  <main class="blog-list-page">
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-left">
        <px-button plain @click="goHome">
          <template #prepend>
            <px-icon icon="arrow-left-solid" size="16" />
          </template>
          返回
        </px-button>
        <div class="header-content">
          <px-text tag="h1" size="20">博客文章</px-text>
          <px-text size="12" type="secondary">浏览所有博客文章</px-text>
        </div>
      </div>
      <px-button type="primary" @click="goToEditor()">
        <template #prepend>
          <px-icon icon="plus-solid" size="16" />
        </template>
        写博客
      </px-button>
    </section>

    <!-- 搜索栏 -->
    <section class="search-bar">
      <px-input
        v-model="searchKeyword"
        placeholder="搜索博客标题..."
        clearable
        @keyup.enter="handleSearch"
      >
        <template #append>
          <px-button type="primary" @click="handleSearch">搜索</px-button>
        </template>
      </px-input>
    </section>

    <!-- 博客卡片网格 -->
    <section class="blog-grid" v-loading="blogStore.loading">
      <!-- 有博客时显示卡片列表 -->
      <template v-if="blogStore.blogs.length > 0">
        <px-card
          v-for="blog in blogStore.blogs"
          :key="blog.id"
          hoverable
          class="blog-card"
          @click="goToDetail(blog.id)"
        >
          <template #header>
            <div class="blog-card-header">
              <px-text tag="h3" size="16">{{ blog.title }}</px-text>
              <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
            </div>
          </template>

          <!-- 博客内容摘要 -->
          <div class="blog-excerpt">
            {{ blog.content?.substring(0, 120) || '暂无内容...' }}{{ (blog.content?.length || 0) > 120 ? '...' : '' }}
          </div>

          <template #footer>
            <!-- 作者信息 -->
            <div class="blog-card-footer">
              <div class="blog-meta">
                <px-icon icon="user-solid" size="14" color="#6b7f87" />
                <px-text size="12" type="secondary">{{ blog.authorName || '匿名' }}</px-text>
              </div>
              <!-- 操作按钮 -->
              <div class="blog-actions" @click.stop>
                <px-button plain size="small" @click="goToEditor(blog.id)">编辑</px-button>
                <px-button plain size="small" type="danger" @click="handleDelete(blog)">删除</px-button>
              </div>
            </div>
          </template>
        </px-card>
      </template>

      <!-- 无博客时显示空状态 -->
      <div v-else-if="!blogStore.loading" class="empty-state">
        <px-icon icon="file-text-solid" size="48" color="#b0bec5" />
        <px-text size="14" type="secondary">暂无博客内容</px-text>
        <px-button type="primary" @click="goToEditor()">开始写博客</px-button>
      </div>

      <!-- 分页加载 -->
      <div v-if="blogStore.blogs.length > 0" class="pagination">
        <px-text size="12" type="secondary">
          共 {{ blogStore.total }} 篇，第 {{ blogStore.currentPage }}/{{ Math.ceil(blogStore.total / blogStore.pageSize) }} 页
        </px-text>
        <px-button 
          v-if="blogStore.hasMore" 
          plain 
          size="small" 
          :loading="blogStore.loading"
          @click="loadMore"
        >
          加载更多
        </px-button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.blog-list-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 1200px;
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

.search-bar {
  margin-bottom: 24px;
}

.search-bar :deep(.px-input) {
  max-width: 480px;
}

.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.blog-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.blog-card:hover {
  transform: translateY(-4px);
}

.blog-card-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.blog-excerpt {
  color: #385b66;
  line-height: 1.7;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blog-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.blog-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.blog-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
}

.pagination {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
}

@media (max-width: 640px) {
  .blog-list-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .blog-grid {
    grid-template-columns: 1fr;
  }
}
</style>