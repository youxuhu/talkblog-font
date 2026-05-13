<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { deleteComment, likeComment } from '@/services/comment'
import { getCurrentUser, isAuthenticated } from '@/services/auth'
import EmojiPicker from '@/components/EmojiPicker.vue'

const props = defineProps({
  comment: { type: Object, required: true },
  blogId: { type: Number, required: true },
  level: { type: Number, default: 0 },
})

const emit = defineEmits(['refresh', 'reply'])

const showReplyBox = ref(false)
const showEditBox = ref(false)
const liked = ref(false)
const likeAnimating = ref(false)
const replyContent = ref('')
const editContent = ref('')
const submitting = ref(false)
const replyInputRef = ref(null)

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

const currentUser = computed(() => getCurrentUser())
const loggedIn = computed(() => isAuthenticated())
const isOwner = computed(() => currentUser.value?.userId === props.comment.userId)
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
    emit('reply', {
      content: replyContent.value.trim(),
      parentId: props.comment.commentId,
    })
    showReplyBox.value = false
    replyContent.value = ''
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

async function handleLike() {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }

  if (liked.value) {
    return
  }

  likeAnimating.value = true
  setTimeout(() => {
    likeAnimating.value = false
  }, 600)

  try {
    const result = await likeComment(props.comment.commentId)
    props.comment.likeCount = result.data.likeCount
    liked.value = true
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

function copyContent() {
  navigator.clipboard?.writeText(props.comment.content)
    .then(() => ElMessage.success('已复制到剪贴板'))
    .catch(() => ElMessage.error('复制失败'))
}
</script>

<template>
  <div :class="['comment-item', { 'is-nested': level > 0 }]">
    <div :class="['comment-card', { 'nested-card': level > 0 }]">
      <div class="comment-header">
        <div class="comment-user">
          <div class="avatar" :style="{ background: avatarColor }">
            {{ comment.username?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="user-info">
            <div class="user-row">
              <span class="username">{{ comment.username }}</span>
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
            <svg :class="['like-icon', { 'animating': likeAnimating }]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <el-dropdown v-if="isOwner || level === 0" trigger="click" class="more-dropdown">
            <span class="action-btn more-btn">
              <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="12" cy="19" r="2"/>
              </svg>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isOwner" @click="copyContent">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  复制内容
                </el-dropdown-item>
                <el-dropdown-item v-if="isOwner" @click="handleDelete">
                  <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  删除评论
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="comment-body">
        <div v-if="comment.replyToUsername" class="reply-target">
          <svg class="reply-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
          </svg>
          回复 <span class="reply-name">@{{ comment.replyToUsername }}</span>
        </div>
        <p class="comment-content">{{ comment.content }}</p>
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
          <EmojiPicker class="reply-emoji-btn" @select="onReplyEmoji" />
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
  background: rgba(255, 255, 255, 0.85);
  border-radius: 14px;
  border: 1px solid rgba(124, 77, 255, 0.08);
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.comment-card:hover {
  border-color: rgba(124, 77, 255, 0.18);
  box-shadow: 0 4px 16px rgba(124, 77, 255, 0.08);
  transform: translateY(-1px);
}

.nested-card {
  padding: 14px;
  background: rgba(255, 255, 255, 0.6);
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
  color: #213547;
  font-weight: 600;
  font-size: 15px;
}

.status-badge.pending {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(237, 137, 54, 0.15);
  color: #dd6b20;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.comment-time {
  color: #9ca3af;
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
  color: #6b7f87;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
  padding: 4px 8px;
  border-radius: 6px;
}

.action-btn:hover {
  color: #7c4dff;
  background: rgba(124, 77, 255, 0.08);
}

.action-icon {
  width: 16px;
  height: 16px;
}

.like-btn {
  color: #6b7f87;
}

.like-btn:hover,
.like-btn.is-liked {
  color: #7c4dff;
}

.like-btn.is-liked {
  background: rgba(124, 77, 255, 0.1);
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

.reply-target {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(124, 77, 255, 0.06);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #6b7f87;
}

.reply-icon {
  width: 14px;
  height: 14px;
}

.reply-name {
  color: #7c4dff;
  font-weight: 500;
}

.comment-content {
  color: #385b66;
  line-height: 1.7;
  margin: 0;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-box {
  margin-top: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(124, 77, 255, 0.15);
}

.reply-input-wrapper {
  position: relative;
}

.reply-emoji-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 10;
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
  border-top: 1px solid rgba(124, 77, 255, 0.1);
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
