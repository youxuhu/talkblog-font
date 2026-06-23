<script setup>
import { computed, onMounted, reactive, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { ElMessage } from 'element-plus'
import { PxMessage } from '@mmt817/pixel-ui'
import { createComment, fetchComments, uploadCommentImage } from '@/services/comment'
import { getCurrentUser, isAuthenticated, isAdminUser } from '@/services/auth'
import * as bookmarkApi from '@/services/bookmark'
import * as followApi from '@/services/follow'
import CommentItem from '@/components/CommentItem.vue'
import EmojiPicker from '@/components/EmojiPicker.vue'
import MentionList from '@/components/MentionList.vue'
import { getCategoryLabel } from '@/config/categories'

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

const commentSort = ref('newest')

const newComment = reactive({
  content: '',
})

const commentInputRef = ref(null)
const commentImageInputRef = ref(null)
const commentImages = ref([])
const uploadingImage = ref(false)

function handleCommentImageSelect(e) {
  const files = e.target.files
  if (!files?.length) return
  for (const file of files) {
    uploadSingleCommentImage(file)
  }
  e.target.value = ''
}

async function uploadSingleCommentImage(file) {
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    ElMessage.warning('仅支持 JPG/PNG/GIF/WebP 格式')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }
  uploadingImage.value = true
  try {
    const res = await uploadCommentImage(file)
    const url = res?.data?.url || res?.data || ''
    if (url) {
      commentImages.value.push(url)
    }
  } catch (err) {
    ElMessage.error(err.message || '图片上传失败')
  } finally {
    uploadingImage.value = false
  }
}

function removeCommentImage(index) {
  commentImages.value.splice(index, 1)
}

const previewImageUrl = ref('')
const showImagePreview = ref(false)

function previewImage(url) {
  previewImageUrl.value = url
  showImagePreview.value = true
}

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

function onInsertMention(username) {
  const textarea = commentInputRef.value?.textarea
  const mention = `@${username} `
  if (textarea && document.activeElement === textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    newComment.content = newComment.content.substring(0, start) + mention + newComment.content.substring(end)
    nextTick(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + mention.length
    })
  } else {
    newComment.content += mention
  }
}

const currentUser = computed(() => getCurrentUser())
const loggedIn = computed(() => isAuthenticated())
const isOwner = computed(() => currentUser.value?.userId === blog.value?.authorId)

const isBookmarked = ref(false)
const isFollowing = ref(false)

async function checkBookmarkStatus() {
  if (!loggedIn.value) return
  try {
    const res = await bookmarkApi.getBookmarkStatus(blogId.value)
    isBookmarked.value = res.data?.bookmarked || false
  } catch { /* ignore */ }
}

async function checkFollowStatus() {
  if (!loggedIn.value || !blog.value?.authorId) return
  try {
    const res = await followApi.getFollowStatus(blog.value.authorId)
    isFollowing.value = res.data?.following || false
  } catch { /* ignore */ }
}

async function handleBookmark() {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  try {
    const res = await bookmarkApi.toggleBookmark(blogId.value)
    isBookmarked.value = res.data?.bookmarked || false
    PxMessage.success(isBookmarked.value ? '已收藏' : '已取消收藏')
  } catch (err) {
    PxMessage.error(err.message || '操作失败')
  }
}

async function handleFollow() {
  if (!loggedIn.value || !blog.value?.authorId) return
  try {
    const res = await followApi.toggleFollow(blog.value.authorId)
    isFollowing.value = res.data?.following || false
    PxMessage.success(isFollowing.value ? '已关注' : '已取消关注')
  } catch (err) {
    PxMessage.error(err.message || '操作失败')
  }
}

onMounted(() => {
  if (blogId.value) {
    blogStore.fetchBlogDetail(blogId.value)
    loadComments()
    checkBookmarkStatus()
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
      sort: commentSort.value,
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
    let finalContent = newComment.content.trim()
    if (commentImages.value.length) {
      finalContent += commentImages.value.map(url => `<br><img src="${url}" class="comment-uploaded-image" />`).join('')
    }
    await createComment({
      blogId: Number(blogId.value),
      content: finalContent,
      parentId: null,
    })

    ElMessage.success('评论发表成功，等待审核')
    newComment.content = ''
    commentImages.value = []
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

function handleSortChange(sort) {
  commentSort.value = sort
  query.page = 1
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
        <px-button v-if="isOwner" plain size="small" @click="router.push(`/blog/${blogId}/versions`)">
          <template #prepend>
            <px-icon icon="history-solid" size="14" />
          </template>
          版本历史
        </px-button>
        <px-button v-if="isOwner" type="primary" @click="goToEditor">
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
            <template v-if="!isOwner && loggedIn">
              <px-button
                plain
                size="small"
                :type="isFollowing ? 'default' : 'primary'"
                @click.stop="handleFollow"
              >
                {{ isFollowing ? '已关注' : '+ 关注' }}
              </px-button>
            </template>
            <px-icon icon="clock-regular" size="14" color="#6b7f87" />
            <px-text size="12" type="secondary">{{ formatDate(blog.createdAt) }}</px-text>
            <template v-if="blog.updatedAt">
              <px-icon icon="edit-regular" size="14" color="#6b7f87" />
              <px-text size="12" type="secondary">更新于 {{ formatDate(blog.updatedAt) }}</px-text>
            </template>
            <template v-if="blog.category">
              <span class="category-tag-detail">{{ getCategoryLabel(blog.category) }}</span>
            </template>
            <template v-if="blog.seriesName">
              <px-icon icon="folder-open-solid" size="14" color="#6b7f87" />
              <router-link :to="`/series/${blog.seriesId}`" class="series-link">
                <px-text size="12" type="secondary">{{ blog.seriesName }}</px-text>
              </router-link>
            </template>
            <px-icon icon="eye-solid" size="14" color="#6b7f87" />
            <px-text size="12" type="secondary">{{ blog.viewCount ?? 0 }} 次阅读</px-text>
          </div>
          <div class="blog-actions-bar">
            <px-button
              plain
              size="small"
              :type="isBookmarked ? 'primary' : 'default'"
              @click="handleBookmark"
            >
              <px-icon :icon="isBookmarked ? 'star-solid' : 'star-regular'" size="14" />
              {{ isBookmarked ? '已收藏' : '收藏' }}
            </px-button>
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
        <div class="comment-section-title">
          <px-text tag="h2" size="18">评论</px-text>
          <px-text size="13" type="secondary">共 {{ total }} 条评论</px-text>
        </div>
        <div class="comment-sort-tabs">
          <button
            :class="['sort-tab', { active: commentSort === 'newest' }]"
            @click="handleSortChange('newest')"
          >最新</button>
          <button
            :class="['sort-tab', { active: commentSort === 'oldest' }]"
            @click="handleSortChange('oldest')"
          >最早</button>
          <button
            :class="['sort-tab', { active: commentSort === 'hot' }]"
            @click="handleSortChange('hot')"
          >最热</button>
        </div>
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
          <div class="comment-input-tools">
            <EmojiPicker @select="onCommentEmoji" />
            <MentionList @select="onInsertMention" />
            <px-button
              plain
              size="small"
              :loading="uploadingImage"
              :disabled="uploadingImage"
              @click="commentImageInputRef?.click()"
            >
              <px-icon icon="camera-solid" size="16" />
            </px-button>
            <input
              ref="commentImageInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              style="display:none"
              @change="handleCommentImageSelect"
            />
          </div>
        </div>
        <div v-if="commentImages.length" class="comment-image-previews">
          <div v-for="(url, index) in commentImages" :key="index" class="comment-image-preview-item">
            <img :src="url" class="comment-image-thumb" @click="previewImage(url)" />
            <span class="comment-image-remove" @click="removeCommentImage(index)">&times;</span>
          </div>
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
    <el-dialog v-model="showImagePreview" width="auto" append-to-body top="5vh" :show-close="true">
      <img :src="previewImageUrl" style="max-width: 80vw; max-height: 80vh; display: block; border-radius: 8px;" />
    </el-dialog>
  </main>
</template>

<style scoped>
.blog-detail-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  background: var(--bg-page);
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

.category-tag-detail {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  line-height: 1.6;
}

.series-link {
  text-decoration: none;
  color: inherit;
}

.series-link:hover {
  color: var(--color-accent);
}

.blog-actions-bar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--card-border);
}

.blog-content {
  color: var(--color-text-secondary);
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
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
  flex-wrap: wrap;
}

.comment-section-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.comment-sort-tabs {
  display: flex;
  gap: 4px;
}

.sort-tab {
  padding: 4px 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.sort-tab:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.sort-tab.active {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.comment-input-section {
  margin-bottom: 24px;
}

.comment-input-wrapper {
  position: relative;
}

.comment-input-tools {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  gap: 4px;
  align-items: center;
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

.comment-image-previews {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.comment-image-preview-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  cursor: pointer;
}

.comment-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-image-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-danger);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
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
