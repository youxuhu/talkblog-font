<script setup>
import { computed, onMounted, reactive, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { ElMessage } from 'element-plus'
import { createComment, fetchComments } from '@/services/comment'
import { getCurrentUser, isAuthenticated } from '@/services/auth'
import { recordView } from '@/services/blog'
import CommentItem from '@/components/CommentItem.vue'
import EmojiPicker from '@/components/EmojiPicker.vue'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()

const blogId = computed(() => route.params.id)
const blog = computed(() => blogStore.currentBlog)

const renderedContent = computed(() => {
  const content = blog.value?.content || ''
  return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0">')
})

const loading = ref(false)
const submitting = ref(false)
const comments = ref([])
const total = ref(0)

const query = reactive({
  page: 1,
  size: 10,
})

const newComment = reactive({
  content: '',
})

const commentInputRef = ref(null)

function onCommentEmoji(emoji) {
  const textarea = commentInputRef.value?.textarea
  if (textarea && document.activeElement === textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    newComment.content = newComment.content.substring(0, start) + emoji + newComment.content.substring(end)
    nextTick(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
    })
  } else {
    newComment.content += emoji
  }
}

const currentUser = computed(() => getCurrentUser())
const loggedIn = computed(() => isAuthenticated())
const isAuthor = computed(() => {
  const user = currentUser.value
  return user && blog.value && blog.value.authorId === user.userId
})

onMounted(() => {
  if (blogId.value) {
    blogStore.fetchBlogDetail(blogId.value)
    recordView(blogId.value).catch(() => {})
    loadComments()
  }
})

function goBack() {
  router.push('/blogs')
}

function goToEditor() {
  router.push(`/blog/editor/${blogId.value}`)
}

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

async function loadComments() {
  loading.value = true
  try {
    const result = await fetchComments({
      blogId: Number(blogId.value),
      page: query.page,
      size: query.size,
    })
    comments.value = result?.data?.list || []
    total.value = result?.data?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '加载评论失败')
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录后再评论')
    router.push('/')
    return
  }

  if (!newComment.content.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  if (newComment.content.trim().length > 500) {
    ElMessage.warning('评论内容不能超过 500 字')
    return
  }

  submitting.value = true
  try {
    await createComment({
      blogId: Number(blogId.value),
      content: newComment.content.trim(),
    })

    ElMessage.success('评论发表成功，等待审核')
    newComment.content = ''
    query.page = 1
    await loadComments()
  } catch (error) {
    ElMessage.error(error?.message || '发表失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

async function handleReply(payload) {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }

  try {
    await createComment({
      blogId: Number(blogId.value),
      content: payload.content,
      parentId: payload.parentId,
    })
    ElMessage.success('回复成功')
    await loadComments()
  } catch (error) {
    ElMessage.error(error?.message || '回复失败')
  }
}

function handlePageChange(page) {
  query.page = page
  loadComments()
}

const likeAnimating = ref(false)

async function handleLike() {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }

  likeAnimating.value = true
  setTimeout(() => { likeAnimating.value = false }, 600)

  try {
    await blogStore.toggleLike(Number(blogId.value))
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}

const favoriteAnimating = ref(false)

async function handleFavorite() {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }

  favoriteAnimating.value = true
  setTimeout(() => { favoriteAnimating.value = false }, 400)

  try {
    await blogStore.toggleFavorite(Number(blogId.value))
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}
</script>

<template>
  <main class="blog-detail-page">
    <section class="page-header">
      <px-button plain @click="goBack">
        <template #prepend>
          <px-icon icon="arrow-left-solid" size="16" />
        </template>
        返回列表
      </px-button>
      <div class="header-actions">
        <px-button v-if="isAuthor" type="primary" @click="goToEditor">
          <template #prepend>
            <px-icon icon="edit-solid" size="16" />
          </template>
          编辑
        </px-button>
      </div>
    </section>

    <px-card v-if="blog" class="blog-detail-card" v-loading="blogStore.loading">
      <template #header>
        <div class="blog-header">
          <px-text tag="h1" size="22">{{ blog.title }}</px-text>
          <div class="blog-meta">
            <px-icon icon="user-solid" size="14" color="#6b7f87" />
            <px-text size="12" type="secondary">{{ blog.authorName || '匿名' }}</px-text>
            <px-icon icon="clock-regular" size="14" color="#6b7f87" />
            <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
            <template v-if="blog.updatedAt">
              <px-icon icon="edit-regular" size="14" color="#6b7f87" />
              <px-text size="12" type="secondary">更新于 {{ formatDate(blog.updatedAt) }}</px-text>
            </template>
            <px-icon icon="eye-solid" size="14" color="#6b7f87" />
            <px-text size="12" type="secondary">{{ blog.viewCount || 0 }} 阅读</px-text>
          </div>
          <div class="blog-cat-tags">
            <span v-if="blog.categoryName" class="blog-category-badge">{{ blog.categoryName }}</span>
            <span v-for="tag in blog.tags" :key="tag.id" class="blog-tag">{{ tag.name }}</span>
          </div>
        </div>
      </template>

      <div class="blog-content" v-html="renderedContent"></div>
    </px-card>

    <div v-if="!blog && !blogStore.loading" class="empty-state">
      <px-icon icon="file-excel-solid" size="48" color="#b0bec5" />
      <px-text size="14" type="secondary">博客不存在或已被删除</px-text>
      <px-button type="primary" @click="goBack">返回列表</px-button>
    </div>

    <div v-if="blog" class="blog-actions">
      <button
        class="action-btn like-btn"
        :class="{ liked: blog.liked, animating: likeAnimating }"
        @click="handleLike"
      >
        <svg class="like-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            :fill="blog.liked ? '#e74c3c' : 'none'"
            :stroke="blog.liked ? '#e74c3c' : '#6b7f87'"
            stroke-width="2"
          />
        </svg>
        <span class="action-count">{{ blog.likeCount || 0 }}</span>
      </button>
      <button
        class="action-btn favorite-btn"
        :class="{ favorited: blog.favorited, animating: favoriteAnimating }"
        @click="handleFavorite"
      >
        <svg class="star-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            :fill="blog.favorited ? '#f1c40f' : 'none'"
            :stroke="blog.favorited ? '#f1c40f' : '#6b7f87'"
            stroke-width="2"
          />
        </svg>
      </button>
    </div>

    <section v-if="blog" class="comment-section">
      <div class="comment-section-header">
        <px-text tag="h2" size="18">评论</px-text>
        <px-text size="13" type="secondary">共 {{ total }} 条评论</px-text>
      </div>

      <div v-if="loggedIn" class="comment-input-section">
        <div class="comment-input-wrapper">
          <el-input
            ref="commentInputRef"
            v-model="newComment.content"
            type="textarea"
            :rows="3"
            placeholder="写下你的想法..."
            maxlength="500"
            show-word-limit
            :disabled="submitting"
          />
          <EmojiPicker class="comment-emoji-btn" @select="onCommentEmoji" />
        </div>
        <div class="input-actions">
          <px-button
            type="primary"
            size="small"
            :loading="submitting"
            :use-throttle="false"
            @click="submitComment"
          >
            发表评论
          </px-button>
        </div>
      </div>

      <div v-else class="login-tip">
        <px-card stamp>
          <px-text size="14">登录后即可发表评论</px-text>
          <px-button type="primary" size="small" :use-throttle="false" @click="router.push('/')">
            去登录
          </px-button>
        </px-card>
      </div>

      <div class="comment-list" v-loading="loading">
        <div v-if="comments.length === 0 && !loading" class="empty-tip">
          <px-text size="14" muted>暂无评论，来抢沙发吧！</px-text>
        </div>

        <div v-for="comment in comments" :key="comment.commentId" class="comment-item-wrapper">
          <CommentItem
            :comment="comment"
            :blog-id="Number(blogId)"
            :level="0"
            @refresh="loadComments"
            @reply="handleReply"
          />
        </div>

        <div v-if="total > query.size" class="pager-wrapper">
          <el-pagination
            :current-page="query.page"
            :page-size="query.size"
            :total="total"
            layout="prev, pager, next"
            background
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </section>
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
  gap: 12px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 8px;
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

.blog-cat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.blog-category-badge {
  display: inline-block;
  padding: 1px 10px;
  border-radius: 10px;
  background: #f0f4ff;
  color: #5c6bc0;
  font-size: 12px;
  line-height: 1.6;
}

.blog-tag {
  padding: 1px 10px;
  border-radius: 10px;
  background: #f5f5f5;
  color: #78909c;
  font-size: 12px;
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

.comment-section {
  margin-top: 32px;
}

.comment-section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.12);
}

.comment-input-section {
  margin-bottom: 24px;
}

.comment-input-wrapper {
  position: relative;
}

.comment-emoji-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.login-tip {
  margin-bottom: 24px;
}

.login-tip > .px-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-tip {
  text-align: center;
  padding: 60px 0;
}

.pager-wrapper {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.blog-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px 0;
  margin-top: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(56, 91, 102, 0.15);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(56, 91, 102, 0.3);
  transform: translateY(-1px);
}

.action-btn.liked {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.08);
}

.action-btn.favorited {
  border-color: #f1c40f;
  background: rgba(241, 196, 15, 0.1);
}

.action-btn.animating {
  animation: btn-pop 0.4s ease;
}

@keyframes btn-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.like-icon,
.star-icon {
  display: block;
  flex-shrink: 0;
}

.action-count {
  font-size: 13px;
  font-weight: 600;
  color: #385b66;
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
