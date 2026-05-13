<script setup>
import { computed, onMounted, reactive, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { ElMessage } from 'element-plus'
import { createComment, fetchComments } from '@/services/comment'
import { getCurrentUser, isAuthenticated } from '@/services/auth'
import CommentItem from '@/components/CommentItem.vue'
import EmojiPicker from '@/components/EmojiPicker.vue'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()

const blogId = computed(() => route.params.id)

const blog = computed(() => blogStore.currentBlog)

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

onMounted(() => {
  if (blogId.value) {
    blogStore.fetchBlogDetail(blogId.value)
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
      parentId: null,
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
        <px-button type="primary" @click="goToEditor">
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
          </div>
        </div>
      </template>

      <div class="blog-content">
        {{ blog.content }}
      </div>
    </px-card>

    <div v-if="!blog && !blogStore.loading" class="empty-state">
      <px-icon icon="file-excel-solid" size="48" color="#b0bec5" />
      <px-text size="14" type="secondary">博客不存在或已被删除</px-text>
      <px-button type="primary" @click="goBack">返回列表</px-button>
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
            :page-sizes="[10, 20, 50]"
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
