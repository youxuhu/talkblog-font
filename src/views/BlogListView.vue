<script setup>
/**
 * 博客列表页
 * 仿知乎分类导航，支持分类筛选、关键词搜索、专栏筛选
 */

import { onMounted, ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PxMessage } from '@mmt817/pixel-ui'
import { getCurrentUser, isAdminUser } from '@/services/auth'
import { getAllSeries } from '@/services/blog'
import { CATEGORIES, getCategoryLabel } from '@/config/categories'

const router = useRouter()
const blogStore = useBlogStore()
const currentUser = computed(() => getCurrentUser())
const isAdmin = computed(() => isAdminUser())

function canEdit(blog) {
  return currentUser.value && currentUser.value.userId === blog.userId
}

function canDelete(blog) {
  return canEdit(blog) || isAdmin.value
}

// 搜索关键词
const searchKeyword = ref('')

// 专栏筛选
const seriesOptions = ref([])
const selectedSeriesId = ref('')

// 当前选中的分类
const activeCategory = ref(blogStore.selectedCategory || '')

// 加载专栏列表
async function loadSeries() {
  try {
    const result = await getAllSeries()
    seriesOptions.value = result.data?.list || result.data || []
  } catch {
    seriesOptions.value = []
  }
}

// 加载更多博客
function loadMore() {
  const nextPage = blogStore.currentPage + 1
  blogStore.fetchBlogs({ page: nextPage, keyword: searchKeyword.value, seriesId: selectedSeriesId.value, category: activeCategory.value })
}

// 组件挂载时获取博客列表
onMounted(() => {
  blogStore.fetchBlogs({ page: 1, keyword: '', category: activeCategory.value })
  loadSeries()
})

// 分类切换
function handleCategoryChange(category) {
  activeCategory.value = category
  blogStore.fetchBlogs({ page: 1, keyword: searchKeyword.value, seriesId: selectedSeriesId.value, category })
}

// 搜索博客
function handleSearch() {
  blogStore.fetchBlogs({ page: 1, keyword: searchKeyword.value, seriesId: selectedSeriesId.value, category: activeCategory.value })
}

// 专栏筛选变化
function handleSeriesChange() {
  blogStore.fetchBlogs({ page: 1, keyword: searchKeyword.value, seriesId: selectedSeriesId.value, category: activeCategory.value })
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
async function handleDelete(blog) {
  try {
    await ElMessageBox.confirm(
      `确定要删除博客「${blog.title}」吗？删除后无法恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    blogStore.deleteBlog(blog.id).then(() => {
      PxMessage.success('删除成功')
    }).catch((err) => {
      PxMessage.error(err.message || '删除失败')
    })
  } catch {
    // 用户取消
  }
}

const expandedBlogs = reactive(new Set())

function toggleExpand(blogId) {
  if (expandedBlogs.has(blogId)) {
    expandedBlogs.delete(blogId)
  } else {
    expandedBlogs.add(blogId)
  }
}

function isExpanded(blogId) {
  return expandedBlogs.has(blogId)
}

const PREVIEW_LENGTH = 200

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

    <!-- 仿知乎分类导航栏 -->
    <section class="category-nav">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.value"
        :class="['category-tab', { active: activeCategory === cat.value }]"
        @click="handleCategoryChange(cat.value)"
      >
        <span class="category-icon">{{ cat.icon }}</span>
        <span class="category-label">{{ cat.label }}</span>
      </button>
    </section>

    <!-- 搜索栏与筛选 -->
    <section class="search-bar">
      <div class="search-row">
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
        <el-select
          v-model="selectedSeriesId"
          placeholder="全部专栏"
          clearable
          style="min-width: 140px"
          @change="handleSeriesChange"
        >
          <el-option
            v-for="s in seriesOptions"
            :key="s.id"
            :value="s.id"
            :label="s.name"
          />
        </el-select>
      </div>
    </section>

    <!-- 博客列表（纵向排列） -->
    <section class="blog-list" v-loading="blogStore.loading">
      <!-- 有博客时显示卡片列表 -->
      <template v-if="blogStore.blogs.length > 0">
        <px-card
          v-for="blog in blogStore.blogs"
          :key="blog.id"
          class="blog-card"
        >
          <template #header>
            <div class="blog-card-header" @click="goToDetail(blog.id)">
              <div class="blog-title-row">
                <px-text tag="h3" size="18">{{ blog.title }}</px-text>
                <span v-if="blog.category" class="category-tag">{{ getCategoryLabel(blog.category) }}</span>
              </div>
              <div class="blog-meta">
                <px-icon icon="user-solid" size="14" color="#6b7f87" />
                <px-text size="12" type="secondary">{{ blog.authorName || '匿名' }}</px-text>
                <px-icon icon="clock-regular" size="14" color="#6b7f87" />
                <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
                <template v-if="blog.seriesName">
                  <px-icon icon="folder-open-solid" size="14" color="#6b7f87" />
                  <px-text size="12" type="secondary">{{ blog.seriesName }}</px-text>
                </template>
                <px-icon icon="eye-solid" size="14" color="#6b7f87" />
                <px-text size="12" type="secondary">{{ blog.viewCount ?? 0 }} 阅读</px-text>
                <span v-if="blog.status === 'SCHEDULED'" class="status-tag scheduled">定时</span>
                <span v-if="blog.status === 'DRAFT'" class="status-tag draft">草稿</span>
              </div>
            </div>
          </template>

          <!-- 博客内容：预览或全文 -->
          <div class="blog-content">
            <template v-if="isExpanded(blog.id) || !blog.content || blog.content.length <= PREVIEW_LENGTH">
              {{ blog.content || '暂无内容...' }}
            </template>
            <template v-else>
              {{ blog.content.substring(0, PREVIEW_LENGTH) }}...
            </template>
          </div>

          <template #footer>
            <div class="blog-card-footer">
              <div class="blog-actions" @click.stop>
                <px-button plain size="small" @click="goToDetail(blog.id)">
                  <px-icon icon="eye-solid" size="12" />
                  查看
                </px-button>
                <px-button v-if="canEdit(blog)" plain size="small" @click="goToEditor(blog.id)">
                  <px-icon icon="edit-solid" size="12" />
                  编辑
                </px-button>
                <px-button v-if="canDelete(blog)" plain size="small" type="danger" @click="handleDelete(blog)">
                  <px-icon icon="trash-solid" size="12" />
                  删除
                </px-button>
              </div>
              <button
                v-if="blog.content && blog.content.length > PREVIEW_LENGTH"
                class="expand-btn"
                @click.stop="toggleExpand(blog.id)"
              >
                {{ isExpanded(blog.id) ? '收起' : '展开全文' }}
                <span :class="['arrow', { up: isExpanded(blog.id) }]">▾</span>
              </button>
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
  background: var(--bg-page);
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

/* 仿知乎分类导航 */
.category-nav {
  display: flex;
  gap: 4px;
  padding: 8px 0 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-nav::-webkit-scrollbar {
  display: none;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: none;
  border-radius: 20px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-tab:hover {
  background: var(--tag-bg);
  color: var(--color-text);
}

.category-tab.active {
  background: var(--color-accent);
  color: #fff;
}

.category-icon {
  font-size: 15px;
  line-height: 1;
}

.search-bar {
  margin-bottom: 24px;
}

.search-bar :deep(.px-input) {
  max-width: 480px;
}

.blog-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.blog-card {
  transition: box-shadow 0.2s ease;
}

.blog-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.blog-card-header {
  cursor: pointer;
}

.blog-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.blog-title-row:hover h3 {
  color: var(--color-accent);
}

.category-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  line-height: 1.6;
}

.blog-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.status-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
}

.status-tag.scheduled {
  background: rgba(237, 137, 54, 0.15);
  color: #ed8936;
}

.status-tag.draft {
  background: rgba(160, 174, 192, 0.2);
  color: var(--color-text-muted);
}

.blog-content {
  color: var(--color-text-secondary);
  line-height: 1.8;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
}

.blog-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.blog-actions {
  display: flex;
  gap: 8px;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background 0.15s;
}

.expand-btn:hover {
  background: var(--tag-bg);
}

.arrow {
  display: inline-block;
  transition: transform 0.2s;
  font-size: 10px;
}

.arrow.up {
  transform: rotate(180deg);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
}

.pagination {
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

  .blog-list {
    gap: 16px;
  }
}
</style>
