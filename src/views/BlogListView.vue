<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { useCategoryStore } from '@/stores/category'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isAuthenticated, getCurrentUser } from '@/services/auth'

const router = useRouter()
const blogStore = useBlogStore()
const categoryStore = useCategoryStore()

const searchKeyword = ref('')
const searchTimer = ref(null)
const selectedCategoryId = ref(null)
const sortBy = ref('')

const sortOptions = [
  { label: '最新', value: '' },
  { label: '最多阅读', value: 'views' },
  { label: '最多点赞', value: 'likes' },
]

function doLoad(page) {
  blogStore.fetchBlogs({
    page,
    keyword: searchKeyword.value,
    categoryId: selectedCategoryId.value,
    sortBy: sortBy.value,
  })
}

function loadMore() {
  doLoad(blogStore.currentPage + 1)
}

onMounted(() => {
  categoryStore.fetchCategories()
  doLoad(1)
  blogStore.fetchPopular(5)
  blogStore.fetchTrending(7, 5)
})

watch(searchKeyword, (val) => {
  clearTimeout(searchTimer.value)
  if (!val) {
    searchTimer.value = setTimeout(() => doLoad(1), 100)
  } else {
    searchTimer.value = setTimeout(() => doLoad(1), 300)
  }
})

function selectCategory(categoryId) {
  selectedCategoryId.value = selectedCategoryId.value === categoryId ? null : categoryId
  doLoad(1)
}

function selectSort(value) {
  sortBy.value = value
  doLoad(1)
}

function goToDetail(blogId) {
  router.push(`/blog/${blogId}`)
}

function goToEditor(blogId = null) {
  router.push(`/blog/editor${blogId ? `/${blogId}` : ''}`)
}

function goHome() {
  router.push('/')
}

async function handleDelete(blog) {
  try {
    await ElMessageBox.confirm(
      `确定要删除博客「${blog.title}」吗？删除后无法恢复。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await blogStore.deleteBlog(blog.id)
    ElMessage.success('删除成功')
  } catch {
    // cancelled
  }
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

function stripTags(text) {
  return text ? text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*>`~-]/g, '').trim() : ''
}

const loggedIn = ref(isAuthenticated())
const currentUser = getCurrentUser()

function isBlogAuthor(blog) {
  return loggedIn.value && currentUser && blog.authorId === currentUser.userId
}

async function handleCardLike(event, blog) {
  event.stopPropagation()
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    await blogStore.toggleLike(blog.id)
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}

async function handleCardFavorite(event, blog) {
  event.stopPropagation()
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    await blogStore.toggleFavorite(blog.id)
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
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

    <div class="list-layout">
      <div class="list-main">
        <!-- 搜索栏 -->
        <section class="search-bar">
          <px-input
            v-model="searchKeyword"
            placeholder="搜索博客标题（自动搜索）..."
            clearable
          >
            <template #prepend>
              <px-icon icon="search-solid" size="14" color="#6b7f87" />
            </template>
          </px-input>
        </section>

        <!-- 分类筛选 -->
        <section v-if="categoryStore.categories.length" class="category-filter">
          <button
            class="category-tag"
            :class="{ active: selectedCategoryId === null }"
            @click="selectCategory(null)"
          >
            全部
          </button>
          <button
            v-for="cat in categoryStore.flatCategories"
            :key="cat.id"
            class="category-tag"
            :class="{ active: selectedCategoryId === cat.id }"
            @click="selectCategory(cat.id)"
          >
            {{ cat.name }}
          </button>
        </section>

        <!-- 排序标签 -->
        <section class="sort-bar">
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            class="sort-tag"
            :class="{ active: sortBy === opt.value }"
            @click="selectSort(opt.value)"
          >
            {{ opt.label }}
          </button>
        </section>

        <!-- 博客卡片网格 -->
        <section class="blog-grid">
          <!-- 骨架屏 -->
          <template v-if="blogStore.loading && blogStore.blogs.length === 0">
            <px-card v-for="n in 6" :key="n" class="blog-card-skeleton">
              <div class="skeleton-header">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-meta"></div>
              </div>
              <div class="skeleton-body">
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-line-short"></div>
              </div>
            </px-card>
          </template>

          <!-- 有博客时显示卡片列表 -->
          <template v-else-if="blogStore.blogs.length > 0">
            <px-card
              v-for="blog in blogStore.blogs"
              :key="blog.id"
              hoverable
              class="blog-card"
              @click="goToDetail(blog.id)"
            >
              <template #header>
                <div class="blog-card-header">
                  <px-text tag="h3" class="blog-title" size="16">{{ blog.title }}</px-text>
                  <div class="blog-header-meta">
                    <span v-if="blog.categoryName" class="blog-category-badge">{{ blog.categoryName }}</span>
                    <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
                  </div>
                </div>
              </template>

              <div class="blog-excerpt">
                {{ stripTags(blog.content).substring(0, 120) || '暂无内容...' }}{{ stripTags(blog.content).length > 120 ? '...' : '' }}
              </div>
              <div v-if="blog.tags?.length" class="blog-card-tags">
                <span v-for="tag in blog.tags" :key="tag.id" class="blog-tag">{{ tag.name }}</span>
              </div>

              <template #footer>
                <div class="blog-card-footer">
                  <div class="blog-meta">
                    <px-icon icon="user-solid" size="14" color="#6b7f87" />
                    <px-text size="12" type="secondary">{{ blog.authorName || '匿名' }}</px-text>
                    <div class="blog-stats">
                      <span class="stat-item">
                        <px-icon icon="eye-solid" size="12" color="#6b7f87" />
                        <span class="stat-count">{{ blog.viewCount || 0 }}</span>
                      </span>
                      <button class="stat-like-btn" :class="{ liked: blog.liked }" @click.stop="handleCardLike($event, blog)">
                        <svg class="stat-heart" viewBox="0 0 24 24" width="13" height="13">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" :fill="blog.liked ? '#e74c3c' : 'none'" :stroke="blog.liked ? '#e74c3c' : '#6b7f87'" stroke-width="2"/>
                        </svg>
                        <span class="stat-count">{{ blog.likeCount || 0 }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="blog-actions" @click.stop>
                    <button class="card-fav-btn" :class="{ favorited: blog.favorited }" @click="handleCardFavorite($event, blog)">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" :fill="blog.favorited ? '#f1c40f' : 'none'" :stroke="blog.favorited ? '#f1c40f' : '#6b7f87'" stroke-width="2"/>
                      </svg>
                    </button>
                    <px-button v-if="isBlogAuthor(blog)" plain size="small" @click="goToEditor(blog.id)">编辑</px-button>
                    <px-button v-if="isBlogAuthor(blog)" plain size="small" type="danger" @click="handleDelete(blog)">删除</px-button>
                  </div>
                </div>
              </template>
            </px-card>
          </template>

          <!-- 搜索无结果 -->
          <div v-else-if="!blogStore.loading && searchKeyword" class="empty-state">
            <px-icon icon="search-solid" size="48" color="#b0bec5" />
            <px-text size="14" type="secondary">没有找到包含「{{ searchKeyword }}」的博客</px-text>
            <px-button plain @click="searchKeyword = ''">清除搜索</px-button>
          </div>

          <!-- 无博客 -->
          <div v-else-if="!blogStore.loading" class="empty-state">
            <px-icon icon="file-text-solid" size="48" color="#b0bec5" />
            <px-text size="14" type="secondary">暂无博客内容</px-text>
            <px-button type="primary" @click="goToEditor()">开始写博客</px-button>
          </div>

          <!-- 加载中（追加模式） -->
          <div v-if="blogStore.loading && blogStore.blogs.length > 0" class="loading-overlay">
            <px-text size="12" type="secondary">加载中...</px-text>
          </div>

          <!-- 分页 -->
          <div v-if="blogStore.blogs.length > 0" class="pagination">
            <px-text size="12" type="secondary">
              共 {{ blogStore.total }} 篇
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
            <px-text v-else size="12" type="secondary">已显示全部</px-text>
          </div>
        </section>
      </div>

      <!-- 侧边栏 -->
      <aside class="list-sidebar">
        <px-card class="sidebar-section">
          <template #header>
            <px-text tag="h4" size="15">热门文章</px-text>
          </template>
          <div v-if="blogStore.popularBlogs.length" class="rank-list">
            <div
              v-for="(blog, idx) in blogStore.popularBlogs"
              :key="blog.id"
              class="rank-item"
              @click="goToDetail(blog.id)"
            >
              <span class="rank-num" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</span>
              <div class="rank-info">
                <px-text class="rank-title" size="13">{{ blog.title }}</px-text>
                <px-text size="11" type="secondary">{{ blog.viewCount || 0 }} 阅读</px-text>
              </div>
            </div>
          </div>
          <div v-else class="sidebar-empty">
            <px-text size="12" type="secondary">暂无数据</px-text>
          </div>
        </px-card>

        <px-card class="sidebar-section">
          <template #header>
            <px-text tag="h4" size="15">近期热门</px-text>
          </template>
          <div v-if="blogStore.trendingBlogs.length" class="rank-list">
            <div
              v-for="(blog, idx) in blogStore.trendingBlogs"
              :key="blog.id"
              class="rank-item"
              @click="goToDetail(blog.id)"
            >
              <span class="rank-num" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</span>
              <div class="rank-info">
                <px-text class="rank-title" size="13">{{ blog.title }}</px-text>
                <px-text size="11" type="secondary">{{ blog.viewCount || 0 }} 阅读</px-text>
              </div>
            </div>
          </div>
          <div v-else class="sidebar-empty">
            <px-text size="12" type="secondary">暂无数据</px-text>
          </div>
        </px-card>
      </aside>
    </div>
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

.list-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.list-main {
  flex: 1;
  min-width: 0;
}

.list-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 24px;
}

.sidebar-section {
  width: 100%;
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  cursor: pointer;
  transition: opacity 0.2s;
  border-bottom: 1px solid rgba(56, 91, 102, 0.08);
}

.rank-item:last-child {
  border-bottom: none;
}

.rank-item:hover {
  opacity: 0.75;
}

.rank-num {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #b0bec5;
  flex-shrink: 0;
}

.rank-num.rank-1 { background: #e74c3c; }
.rank-num.rank-2 { background: #e67e22; }
.rank-num.rank-3 { background: #f1c40f; color: #385b66; }

.rank-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-empty {
  padding: 20px 0;
  text-align: center;
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

.blog-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

.blog-header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.blog-category-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  background: #f0f4ff;
  color: #5c6bc0;
  font-size: 11px;
  line-height: 1.6;
}

.blog-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.blog-tag {
  padding: 1px 8px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #78909c;
  font-size: 11px;
}

.category-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.sort-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.sort-tag {
  padding: 4px 14px;
  border-radius: 16px;
  border: 1px solid #d9e2e8;
  background: #fff;
  color: #546e7a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-tag:hover {
  border-color: #7c4dff;
  color: #7c4dff;
}

.sort-tag.active {
  background: #7c4dff;
  color: #fff;
  border-color: #7c4dff;
}

.category-tag {
  padding: 5px 14px;
  border-radius: 16px;
  border: 1px solid #d9e2e8;
  background: #fff;
  color: #546e7a;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-tag:hover {
  border-color: #7c4dff;
  color: #7c4dff;
}

.category-tag.active {
  background: #7c4dff;
  color: #fff;
  border-color: #7c4dff;
}

/* 骨架屏 */
.blog-card-skeleton {
  pointer-events: none;
}

.skeleton-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, #e8ecf0 25%, #f0f2f5 50%, #e8ecf0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-title {
  width: 65%;
  height: 18px;
}

.skeleton-meta {
  width: 35%;
  height: 12px;
}

.skeleton-line-short {
  width: 45%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.loading-overlay {
  grid-column: 1 / -1;
  text-align: center;
  padding: 12px 0;
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

.blog-stats {
  display: flex;
  align-items: center;
  margin-left: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-right: 6px;
}

.stat-heart {
  display: block;
  opacity: 0.6;
}

.stat-count {
  font-size: 11px;
  color: #6b7f87;
  font-weight: 600;
}

.card-fav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(56, 91, 102, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s ease;
}

.card-fav-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(56, 91, 102, 0.3);
}

.card-fav-btn.favorited {
  border-color: #f1c40f;
  background: rgba(241, 196, 15, 0.1);
}

.stat-like-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border: 1px solid rgba(56, 91, 102, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.stat-like-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(56, 91, 102, 0.25);
}

.stat-like-btn.liked {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.08);
}

.stat-like-btn.liked .stat-count {
  color: #e74c3c;
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

  .list-layout {
    flex-direction: column;
  }

  .list-sidebar {
    width: 100%;
    position: static;
  }
}
</style>