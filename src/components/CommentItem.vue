<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteComment, likeComment, reportComment, updateComment, uploadCommentImage } from '@/services/comment'
import { getCurrentUser, isAuthenticated, isAdminUser } from '@/services/auth'
import EmojiPicker from '@/components/EmojiPicker.vue'
import MentionList from '@/components/MentionList.vue'

const props = defineProps({
  comment: { type: Object, required: true },
  blogId: { type: Number, required: true },
  level: { type: Number, default: 0 },
})

const emit = defineEmits(['refresh', 'reply'])

const showReplyBox = ref(false)
const showEditBox = ref(false)
const showReportDialog = ref(false)
const liked = ref(false)
const likeAnimating = ref(false)
const replyContent = ref('')
const editContent = ref('')
const submitting = ref(false)
const editSubmitting = ref(false)
const replyInputRef = ref(null)
const reportForm = reactive({ reason: '', description: '' })
const replyImages = ref([])
const replyUploading = ref(false)
const replyImageInputRef = ref(null)
const previewImageUrl = ref('')
const showImagePreview = ref(false)

function handleReplyImageSelect(e) {
  const files = e.target.files
  if (!files?.length) return
  for (const file of files) {
    uploadSingleReplyImage(file)
  }
  e.target.value = ''
}

async function uploadSingleReplyImage(file) {
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    ElMessage.warning('仅支持 JPG/PNG/GIF/WebP 格式')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }
  replyUploading.value = true
  try {
    const res = await uploadCommentImage(file)
    const url = res?.data?.url || res?.data || ''
    if (url) {
      replyImages.value.push(url)
    }
  } catch (err) {
    ElMessage.error(err.message || '图片上传失败')
  } finally {
    replyUploading.value = false
  }
}

function removeReplyImage(index) {
  replyImages.value.splice(index, 1)
}

function previewImage(url) {
  previewImageUrl.value = url
  showImagePreview.value = true
}

function onReplyEmoji(emoji) {
  const textarea = replyInputRef.value?.textarea
  if (textarea && document.activeElement === textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    replyContent.value = replyContent.value.substring(0, start) + emoji + replyContent.value.substring(end)
    nextTick(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
    })
  } else {
    replyContent.value += emoji
  }
}

function onReplyMention(username) {
  const textarea = replyInputRef.value?.textarea
  const mention = `@${username} `
  if (textarea && document.activeElement === textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    replyContent.value = replyContent.value.substring(0, start) + mention + replyContent.value.substring(end)
    nextTick(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + mention.length
    })
  } else {
    replyContent.value += mention
  }
}

const currentUser = computed(() => getCurrentUser())
const loggedIn = computed(() => isAuthenticated())
const isOwner = computed(() => currentUser.value?.userId === props.comment.userId)
const isAdmin = computed(() => isAdminUser())
const maxLevel = 4

const avatarColors = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a8edea, #fed6e3)',
  'linear-gradient(135deg, #d299c2, #fef9d7)',
  'linear-gradient(135deg, #89f7fe, #66a6ff)',
]

const avatarColor = computed(() => {
  const username = props.comment.username || ''
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
})

function highlightMentions(text) {
  if (!text) return text
  return text.replace(/@(\S{1,50})/g, '<span class="mention">@$1</span>')
}

function startReply() {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  showReplyBox.value = true
  replyContent.value = `@${props.comment.username} `
}

function cancelReply() {
  showReplyBox.value = false
  replyContent.value = ''
}

async function submitReply() {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (replyContent.value.trim().length > 500) {
    ElMessage.warning('回复内容不能超过 500 字')
    return
  }

  submitting.value = true
  try {
    let finalContent = replyContent.value.trim()
    if (replyImages.value.length) {
      finalContent += replyImages.value.map(url => `<br><img src="${url}" class="comment-uploaded-image" />`).join('')
    }
    emit('reply', {
      content: finalContent,
      parentId: props.comment.commentId,
    })
    showReplyBox.value = false
    replyContent.value = ''
    replyImages.value = []
  } catch (error) {
    ElMessage.error(error?.message || '回复失败')
  } finally {
    submitting.value = false
  }
}

function startEdit() {
  showEditBox.value = true
  editContent.value = props.comment.content
}

function cancelEdit() {
  showEditBox.value = false
  editContent.value = ''
}

async function submitEdit() {
  if (!editContent.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  if (editContent.value.trim().length > 500) {
    ElMessage.warning('评论内容不能超过 500 字')
    return
  }

  editSubmitting.value = true
  try {
    const result = await updateComment(props.comment.commentId, editContent.value.trim())
    if (result?.data) {
      props.comment.content = result.data.content
      props.comment.editCount = result.data.editCount
    } else {
      props.comment.content = editContent.value.trim()
      props.comment.editCount = (props.comment.editCount || 0) + 1
    }
    ElMessage.success('评论已编辑')
    showEditBox.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(error?.message || '编辑失败')
  } finally {
    editSubmitting.value = false
  }
}

async function handleLike() {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }

  likeAnimating.value = true
  setTimeout(() => {
    likeAnimating.value = false
  }, 600)

  try {
    const result = await likeComment(props.comment.commentId)
    props.comment.likeCount = result.data.likeCount
    liked.value = result.data.userLiked
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  }
}

async function handleDelete() {
  try {
    await deleteComment(props.comment.commentId)
    ElMessage.success('评论已删除')
    emit('refresh')
  } catch (error) {
    ElMessage.error(error?.message || '删除失败')
  }
}

function openReportDialog() {
  reportForm.reason = ''
  reportForm.description = ''
  showReportDialog.value = true
}

async function submitReport() {
  if (!reportForm.reason.trim()) {
    ElMessage.warning('请选择举报原因')
    return
  }
  try {
    await reportComment(props.comment.commentId, {
      reason: reportForm.reason.trim(),
      description: reportForm.description.trim(),
    })
    ElMessage.success('举报已提交，我们会尽快处理')
    showReportDialog.value = false
  } catch (error) {
    ElMessage.error(error?.message || '举报失败')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function onContentClick(e) {
  const img = e.target.closest('.comment-uploaded-image')
  if (img) {
    previewImage(img.src)
  }
}

function copyContent() {
  navigator.clipboard?.writeText(props.comment.content)
    .then(() => ElMessage.success('已复制到剪贴板'))
    .catch(() => ElMessage.error('复制失败'))
}
</script>

<template>
  <div :class="['comment-item', { 'is-nested': level > 0 }]">
    <div :class="['comment-card', { 'nested-card': level > 0, 'is-pinned': comment.isPinned }]">
      <div class="comment-header">
        <div class="comment-user">
          <div v-if="comment.avatarUrl" class="avatar">
            <img :src="comment.avatarUrl" :alt="comment.username" class="avatar-img" />
          </div>
          <div v-else class="avatar" :style="{ background: avatarColor }">
            {{ comment.username?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="user-info">
            <div class="user-row">
              <span class="username">{{ comment.username }}</span>
              <span v-if="comment.isPinned" class="pin-badge">置顶</span>
              <span v-if="comment.editCount > 0" class="edited-badge">已编辑</span>
              <span v-if="comment.status === 0" class="status-badge pending">待审核</span>
            </div>
            <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
          </div>
        </div>
        <div class="comment-actions">
          <span
            :class="['action-btn', 'like-btn', { 'is-liked': liked, 'is-animating': likeAnimating }]"
            @click="handleLike"
          >
            <svg v-if="liked" :class="['like-icon', 'is-liked-icon', { 'animating': likeAnimating }]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <svg v-else :class="['like-icon', { 'animating': likeAnimating }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span class="like-count">{{ comment.likeCount || 0 }}</span>
          </span>
          <span class="action-btn" @click="startReply">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            回复
          </span>
          <el-dropdown trigger="click" class="more-dropdown">
            <span class="action-btn more-btn">
              <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="copyContent">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  复制内容
                </el-dropdown-item>
                <el-dropdown-item v-if="isOwner" @click="startEdit">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  编辑评论
                </el-dropdown-item>
                <el-dropdown-item v-if="isOwner" @click="handleDelete">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  删除评论
                </el-dropdown-item>
                <el-dropdown-item v-if="!isOwner && loggedIn" @click="openReportDialog">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                  </svg>
                  举报
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div v-if="showEditBox" class="edit-box">
        <div class="edit-input-wrapper">
          <el-input
            v-model="editContent"
            type="textarea"
            :rows="3"
            placeholder="编辑评论..."
            maxlength="500"
            show-word-limit
            :disabled="editSubmitting"
            autofocus
          />
        </div>
        <div class="edit-actions">
          <px-button plain size="small" :use-throttle="false" @click="cancelEdit">取消</px-button>
          <px-button type="primary" size="small" :loading="editSubmitting" :use-throttle="false" @click="submitEdit">保存</px-button>
        </div>
      </div>

      <div v-else class="comment-body">
        <div v-if="comment.replyToUsername" class="reply-target">
          <svg class="reply-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
          </svg>
          回复 <span class="reply-name">@{{ comment.replyToUsername }}</span>
        </div>
        <p class="comment-content" v-html="highlightMentions(comment.content)" @click="onContentClick"></p>
        <div v-if="comment.images?.length" class="comment-images">
          <div
            v-for="(img, idx) in comment.images"
            :key="idx"
            class="comment-image-item"
            @click="previewImage(img)"
          >
            <img :src="img" class="comment-image" alt="评论图片" />
          </div>
        </div>
      </div>

      <div v-if="showReplyBox" class="reply-box">
        <div class="reply-input-wrapper">
          <el-input
            ref="replyInputRef"
            v-model="replyContent"
            type="textarea"
            :rows="2"
            placeholder="写下你的回复..."
            maxlength="500"
            show-word-limit
            :disabled="submitting"
            autofocus
          />
          <div class="reply-input-tools">
            <EmojiPicker @select="onReplyEmoji" />
            <MentionList @select="onReplyMention" />
            <px-button
              plain
              size="small"
              :loading="replyUploading"
              :disabled="replyUploading"
              @click="replyImageInputRef?.click()"
            >
              <px-icon icon="camera-solid" size="16" />
            </px-button>
            <input
              ref="replyImageInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              style="display:none"
              @change="handleReplyImageSelect"
            />
          </div>
        </div>
        <div v-if="replyImages.length" class="reply-image-previews">
          <div v-for="(url, index) in replyImages" :key="index" class="reply-image-preview-item">
            <img :src="url" class="reply-image-thumb" />
            <span class="reply-image-remove" @click="removeReplyImage(index)">&times;</span>
          </div>
        </div>
        <div class="reply-actions">
          <px-button plain size="small" :use-throttle="false" @click="cancelReply">取消</px-button>
          <px-button type="primary" size="small" :loading="submitting" :use-throttle="false" @click="submitReply">发表回复</px-button>
        </div>
      </div>

      <div v-if="comment.replies?.length" :class="['reply-list', { 'has-more': level >= maxLevel }]">
        <div v-for="reply in comment.replies" :key="reply.commentId" class="reply-thread">
          <CommentItem
            :comment="reply"
            :blog-id="blogId"
            :level="level + 1"
            @refresh="$emit('refresh')"
            @reply="$emit('reply', $event)"
          />
        </div>
      </div>
    </div>

    <el-dialog v-model="showImagePreview" width="auto" append-to-body top="5vh" :show-close="true">
      <img :src="previewImageUrl" style="max-width: 80vw; max-height: 80vh; display: block; border-radius: 8px;" />
    </el-dialog>

    <el-dialog v-model="showReportDialog" title="举报评论" width="420px" append-to-body>
      <div class="report-dialog">
        <p class="report-comment-preview">{{ comment.content }}</p>
        <el-select v-model="reportForm.reason" placeholder="请选择举报原因" style="width: 100%" clearable>
          <el-option label="垃圾广告" value="SPAM" />
          <el-option label="辱骂攻击" value="ABUSE" />
          <el-option label="色情低俗" value="PORN" />
          <el-option label="违法信息" value="ILLEGAL" />
          <el-option label="其他" value="OTHER" />
        </el-select>
        <el-input
          v-model="reportForm.description"
          type="textarea"
          :rows="3"
          placeholder="补充描述（选填）"
          maxlength="500"
          style="margin-top: 12px"
        />
      </div>
      <template #footer>
        <px-button plain @click="showReportDialog = false">取消</px-button>
        <px-button type="primary" @click="submitReport">提交举报</px-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.comment-item {
  margin-bottom: 16px;
}

.comment-item.is-nested {
  margin-left: 32px;
  margin-bottom: 12px;
}

.comment-card {
  padding: 18px;
  background: var(--card-bg);
  border-radius: 14px;
  border: 1px solid var(--card-border);
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.comment-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 4px 16px rgba(124, 77, 255, 0.08);
  transform: translateY(-1px);
}

.comment-card.is-pinned {
  border-color: var(--color-warning);
  background: linear-gradient(135deg, rgba(237, 137, 54, 0.05), transparent);
}

.nested-card {
  padding: 14px;
  background: var(--card-bg);
  border-radius: 12px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.comment-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.username {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 15px;
}

.pin-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(237, 137, 54, 0.15);
  color: var(--color-warning);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.edited-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--tag-bg);
  color: var(--color-text-muted);
  border-radius: 6px;
  font-size: 11px;
}

.status-badge.pending {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(237, 137, 54, 0.15);
  color: var(--color-warning);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.comment-time {
  color: var(--color-text-light);
  font-size: 12px;
}

.comment-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
  padding: 4px 8px;
  border-radius: 6px;
}

.action-btn:hover {
  color: var(--color-accent);
  background: var(--tag-bg);
}

.action-icon {
  width: 16px;
  height: 16px;
}

.like-btn {
  color: var(--color-text-muted);
}

.like-btn:hover,
.like-btn.is-liked {
  color: var(--color-accent);
}

.like-btn.is-liked {
  background: var(--tag-bg);
}

.like-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.like-icon.animating {
  animation: likePulse 0.6s ease;
}

.like-count {
  font-size: 13px;
  font-weight: 500;
}

.more-btn {
  padding: 4px;
}

.more-dropdown {
  display: flex;
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

@keyframes likePulse {
  0% { transform: scale(1); }
  30% { transform: scale(1.3) rotate(-10deg); }
  60% { transform: scale(0.9) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.comment-body {
  margin-bottom: 4px;
}

.edit-box {
  margin-bottom: 4px;
}

.edit-input-wrapper {
  position: relative;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.reply-target {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--color-accent-bg);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.reply-icon {
  width: 14px;
  height: 14px;
}

.reply-name {
  color: var(--color-accent);
  font-weight: 500;
}

.comment-content {
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin: 0;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-content :deep(.mention) {
  color: var(--color-accent);
  font-weight: 500;
}

.comment-content :deep(.comment-uploaded-image) {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  margin-top: 8px;
  cursor: pointer;
  object-fit: cover;
}

.reply-box {
  margin-top: 14px;
  padding: 14px;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--color-accent);
}

.reply-input-wrapper {
  position: relative;
}

.reply-input-tools {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  gap: 4px;
  align-items: center;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.reply-list {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
}

.reply-thread {
  position: relative;
}

.reply-thread::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, rgba(124, 77, 255, 0.2), rgba(124, 77, 255, 0.05));
  border-radius: 1px;
}

.report-dialog {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.report-comment-preview {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
  padding: 12px;
  background: var(--tag-bg);
  border-radius: 8px;
  margin: 0 0 8px;
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comment-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.comment-image-item {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  cursor: pointer;
  transition: transform 0.15s;
}

.comment-image-item:hover {
  transform: scale(1.03);
}

.comment-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reply-image-previews {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.reply-image-preview-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--card-border);
}

.reply-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reply-image-remove {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-danger);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

@media (max-width: 640px) {
  .comment-item.is-nested {
    margin-left: 16px;
  }

  .comment-card {
    padding: 14px;
  }

  .comment-header {
    flex-direction: column;
  }

  .comment-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .avatar {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
}
</style>
