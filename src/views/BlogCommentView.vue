<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createComment, deleteComment, fetchComments, likeComment } from '@/services/comment'
import { getAccessToken, getCurrentUser, isAuthenticated } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const blogId = computed(() => Number(route.params.blogId) || Number(route.query.blogId) || 1)

const loading = ref(false)
const submitting = ref(false)
const comments = ref([])
const total = ref(0)
const replyTarget = ref(null)

const query = reactive({
  page: 1,
  size: 10,
})

const newComment = reactive({
  content: '',
})

const currentUser = computed(() => getCurrentUser())
const loggedIn = computed(() => isAuthenticated())

onMounted(() => {
  loadComments()
})

async function loadComments() {
  loading.value = true
  try {
    const result = await fetchComments({
      blogId: blogId.value,
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
      blogId: blogId.value,
      content: newComment.content.trim(),
      parentId: replyTarget.value?.commentId || null,
    })

    ElMessage.success(replyTarget.value ? '回复成功' : '评论发表成功，等待审核')
    newComment.content = ''
    replyTarget.value = null
    query.page = 1
    await loadComments()
  } catch (error) {
    ElMessage.error(error?.message || '发表失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

async function handleLike(comment) {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }

  try {
    const result = await likeComment(comment.commentId)
    comment.likeCount = result.data.likeCount
    ElMessage.success(result.message || '已点赞')
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  }
}

function startReply(comment) {
  if (!loggedIn.value) {
    ElMessage.warning('请先登录')
    return
  }
  replyTarget.value = comment
  newComment.content = `@${comment.username} `
}

function cancelReply() {
  replyTarget.value = null
  newComment.content = ''
}

async function handleDelete(comment) {
  try {
    await deleteComment(comment.commentId)
    ElMessage.success('评论已删除')
    await loadComments()
  } catch (error) {
    ElMessage.error(error?.message || '删除失败')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handlePageChange(page) {
  query.page = page
  loadComments()
}

function goBack() {
  router.back()
}

function isInlineReplyBoxVisible(comment) {
  return replyTarget.value?.commentId === comment.commentId
}
</script>

<template>
  <main class="comment-page">
    <section class="comment-header">
      <div>
        <px-button plain size="small" :use-throttle="false" @click="goBack">
          返回
        </px-button>
        <h1 class="comment-title">文章评论</h1>
        <p class="comment-subtitle">博客 ID: {{ blogId }} · 共 {{ total }} 条评论</p>
      </div>
    </section>

    <section class="comment-input-section" v-if="loggedIn">
      <px-card stamp class="input-card">
        <template #header>
          <px-text tag="h2" size="14">
            {{ replyTarget ? `回复 @${replyTarget.username}` : '发表评论' }}
          </px-text>
        </template>

        <div class="input-wrapper">
          <el-input
            v-model="newComment.content"
            type="textarea"
            :rows="3"
            placeholder="写下你的想法..."
            maxlength="500"
            show-word-limit
            :disabled="submitting"
          />
          <div class="input-actions">
            <px-button
              v-if="replyTarget"
              plain
              size="small"
              :use-throttle="false"
              @click="cancelReply"
            >
              取消回复
            </px-button>
            <px-button
              type="primary"
              size="small"
              :loading="submitting"
              :use-throttle="false"
              @click="submitComment"
            >
              {{ replyTarget ? '发表回复' : '发表评论' }}
            </px-button>
          </div>
        </div>
      </px-card>
    </section>

    <section v-else class="login-tip">
      <px-card stamp>
        <px-text size="14">登录后即可发表评论</px-text>
        <px-button type="primary" size="small" :use-throttle="false" @click="router.push('/')">
          去登录
        </px-button>
      </px-card>
    </section>

    <section class="comment-list" v-loading="loading">
      <div v-if="comments.length === 0" class="empty-tip">
        <px-text size="14" muted>暂无评论，来抢沙发吧！</px-text>
      </div>

      <div v-for="comment in comments" :key="comment.commentId" class="comment-item">
        <px-card class="comment-card" hoverable>
          <div class="comment-meta">
            <div class="comment-user">
              <div class="avatar-placeholder">
                {{ comment.username?.charAt(0)?.toUpperCase() || '?' }}
              </div>
              <div class="user-info">
                <span class="username">{{ comment.username }}</span>
                <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
              </div>
            </div>
            <div class="comment-actions">
              <span class="action-btn" @click="handleLike(comment)">
                {{ comment.likeCount > 0 ? `👍 ${comment.likeCount}` : '👍' }}
              </span>
              <span class="action-btn" @click="startReply(comment)">回复</span>
              <span
                v-if="currentUser?.userId === comment.userId"
                class="action-btn delete"
                @click="handleDelete(comment)"
              >
                删除
              </span>
            </div>
          </div>

          <div class="comment-content">
            <span v-if="comment.replyToUsername" class="reply-to">
              回复 @{{ comment.replyToUsername }}：
            </span>
            {{ comment.content }}
          </div>

          <div v-if="comment.status === 0" class="comment-status pending">
            待审核
          </div>

          <div v-if="replyTarget?.commentId === comment.commentId" class="inline-reply-box">
            <div class="inline-reply-header">
              <px-text size="13">回复 @{{ replyTarget.username }}</px-text>
              <span class="close-btn" @click="cancelReply">×</span>
            </div>
            <el-input
              v-model="newComment.content"
              type="textarea"
              :rows="2"
              placeholder="写下你的回复..."
              maxlength="500"
              show-word-limit
              :disabled="submitting"
            />
            <div class="inline-reply-actions">
              <px-button
                plain
                size="small"
                :use-throttle="false"
                @click="cancelReply"
              >
                取消
              </px-button>
              <px-button
                type="primary"
                size="small"
                :loading="submitting"
                :use-throttle="false"
                @click="submitComment"
              >
                发表回复
              </px-button>
            </div>
          </div>

          <div v-if="comment.replies?.length" class="reply-list">
            <div v-for="reply in comment.replies" :key="reply.commentId" class="reply-item">
              <div class="reply-meta">
                <div class="avatar-placeholder small">
                  {{ reply.username?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div class="user-info">
                  <span class="username">{{ reply.username }}</span>
                  <span class="comment-time">{{ formatDate(reply.createdAt) }}</span>
                </div>
              </div>
              <div class="comment-content">
                <span v-if="reply.replyToUsername" class="reply-to">
                  回复 @{{ reply.replyToUsername }}：
                </span>
                {{ reply.content }}
              </div>
              <div class="reply-actions">
                <span class="action-btn" @click="handleLike(reply)">
                  {{ reply.likeCount > 0 ? `👍 ${reply.likeCount}` : '👍' }}
                </span>
                <span class="action-btn" @click="startReply(reply)">回复</span>
                <span
                  v-if="currentUser?.userId === reply.userId"
                  class="action-btn delete"
                  @click="handleDelete(reply)"
                >
                  删除
                </span>
              </div>

              <div v-if="isInlineReplyBoxVisible(reply)" class="inline-reply-box nested">
                <div class="inline-reply-header">
                  <px-text size="13">回复 @{{ replyTarget.username }}</px-text>
                  <span class="close-btn" @click="cancelReply">×</span>
                </div>
                <el-input
                  v-model="newComment.content"
                  type="textarea"
                  :rows="2"
                  placeholder="写下你的回复..."
                  maxlength="500"
                  show-word-limit
                  :disabled="submitting"
                />
                <div class="inline-reply-actions">
                  <px-button
                    plain
                    size="small"
                    :use-throttle="false"
                    @click="cancelReply"
                  >
                    取消
                  </px-button>
                  <px-button
                    type="primary"
                    size="small"
                    :loading="submitting"
                    :use-throttle="false"
                    @click="submitComment"
                  >
                    发表回复
                  </px-button>
                </div>
              </div>

              <div v-if="reply.replies?.length" class="reply-list nested">
                <div v-for="r2 in reply.replies" :key="r2.commentId" class="reply-item">
                  <div class="reply-meta">
                    <div class="avatar-placeholder small">
                      {{ r2.username?.charAt(0)?.toUpperCase() || '?' }}
                    </div>
                    <div class="user-info">
                      <span class="username">{{ r2.username }}</span>
                      <span class="comment-time">{{ formatDate(r2.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="comment-content">
                    <span v-if="r2.replyToUsername" class="reply-to">
                      回复 @{{ r2.replyToUsername }}：
                    </span>
                    {{ r2.content }}
                  </div>
                  <div class="reply-actions">
                    <span class="action-btn" @click="handleLike(r2)">
                      {{ r2.likeCount > 0 ? `👍 ${r2.likeCount}` : '👍' }}
                    </span>
                    <span class="action-btn" @click="startReply(r2)">回复</span>
                    <span
                      v-if="currentUser?.userId === r2.userId"
                      class="action-btn delete"
                      @click="handleDelete(r2)"
                    >
                      删除
                    </span>
                  </div>

                  <div v-if="isInlineReplyBoxVisible(r2)" class="inline-reply-box nested">
                    <div class="inline-reply-header">
                      <px-text size="13">回复 @{{ replyTarget.username }}</px-text>
                      <span class="close-btn" @click="cancelReply">×</span>
                    </div>
                    <el-input
                      v-model="newComment.content"
                      type="textarea"
                      :rows="2"
                      placeholder="写下你的回复..."
                      maxlength="500"
                      show-word-limit
                      :disabled="submitting"
                    />
                    <div class="inline-reply-actions">
                      <px-button
                        plain
                        size="small"
                        :use-throttle="false"
                        @click="cancelReply"
                      >
                        取消
                      </px-button>
                      <px-button
                        type="primary"
                        size="small"
                        :loading="submitting"
                        :use-throttle="false"
                        @click="submitComment"
                      >
                        发表回复
                      </px-button>
                    </div>
                  </div>

                  <div v-if="r2.replies?.length" class="reply-list nested">
                    <div v-for="r3 in r2.replies" :key="r3.commentId" class="reply-item">
                      <div class="reply-meta">
                        <div class="avatar-placeholder small">
                          {{ r3.username?.charAt(0)?.toUpperCase() || '?' }}
                        </div>
                        <div class="user-info">
                          <span class="username">{{ r3.username }}</span>
                          <span class="comment-time">{{ formatDate(r3.createdAt) }}</span>
                        </div>
                      </div>
                      <div class="comment-content">
                        <span v-if="r3.replyToUsername" class="reply-to">
                          回复 @{{ r3.replyToUsername }}：
                        </span>
                        {{ r3.content }}
                      </div>
                      <div class="reply-actions">
                        <span class="action-btn" @click="handleLike(r3)">
                          {{ r3.likeCount > 0 ? `👍 ${r3.likeCount}` : '👍' }}
                        </span>
                        <span class="action-btn" @click="startReply(r3)">回复</span>
                        <span
                          v-if="currentUser?.userId === r3.userId"
                          class="action-btn delete"
                          @click="handleDelete(r3)"
                        >
                          删除
                        </span>
                      </div>

                      <div v-if="isInlineReplyBoxVisible(r3)" class="inline-reply-box nested">
                        <div class="inline-reply-header">
                          <px-text size="13">回复 @{{ replyTarget.username }}</px-text>
                          <span class="close-btn" @click="cancelReply">×</span>
                        </div>
                        <el-input
                          v-model="newComment.content"
                          type="textarea"
                          :rows="2"
                          placeholder="写下你的回复..."
                          maxlength="500"
                          show-word-limit
                          :disabled="submitting"
                        />
                        <div class="inline-reply-actions">
                          <px-button
                            plain
                            size="small"
                            :use-throttle="false"
                            @click="cancelReply"
                          >
                            取消
                          </px-button>
                          <px-button
                            type="primary"
                            size="small"
                            :loading="submitting"
                            :use-throttle="false"
                            @click="submitComment"
                          >
                            发表回复
                          </px-button>
                        </div>
                      </div>

                      <div v-if="r3.replies?.length" class="reply-list nested">
                        <div v-for="r4 in r3.replies" :key="r4.commentId" class="reply-item">
                          <div class="reply-meta">
                            <div class="avatar-placeholder small">
                              {{ r4.username?.charAt(0)?.toUpperCase() || '?' }}
                            </div>
                            <div class="user-info">
                              <span class="username">{{ r4.username }}</span>
                              <span class="comment-time">{{ formatDate(r4.createdAt) }}</span>
                            </div>
                          </div>
                          <div class="comment-content">
                            <span v-if="r4.replyToUsername" class="reply-to">
                              回复 @{{ r4.replyToUsername }}：
                            </span>
                            {{ r4.content }}
                          </div>
                          <div class="reply-actions">
                            <span class="action-btn" @click="handleLike(r4)">
                              {{ r4.likeCount > 0 ? `👍 ${r4.likeCount}` : '👍' }}
                            </span>
                            <span class="action-btn" @click="startReply(r4)">回复</span>
                            <span
                              v-if="currentUser?.userId === r4.userId"
                              class="action-btn delete"
                              @click="handleDelete(r4)"
                            >
                              删除
                            </span>
                          </div>

                          <div v-if="isInlineReplyBoxVisible(r4)" class="inline-reply-box nested">
                            <div class="inline-reply-header">
                              <px-text size="13">回复 @{{ replyTarget.username }}</px-text>
                              <span class="close-btn" @click="cancelReply">×</span>
                            </div>
                            <el-input
                              v-model="newComment.content"
                              type="textarea"
                              :rows="2"
                              placeholder="写下你的回复..."
                              maxlength="500"
                              show-word-limit
                              :disabled="submitting"
                            />
                            <div class="inline-reply-actions">
                              <px-button
                                plain
                                size="small"
                                :use-throttle="false"
                                @click="cancelReply"
                              >
                                取消
                              </px-button>
                              <px-button
                                type="primary"
                                size="small"
                                :loading="submitting"
                                :use-throttle="false"
                                @click="submitComment"
                              >
                                发表回复
                              </px-button>
                            </div>
                          </div>

                          <div v-if="r4.replies?.length" class="reply-list nested">
                            <div v-for="r5 in r4.replies" :key="r5.commentId" class="reply-item">
                              <div class="reply-meta">
                                <div class="avatar-placeholder small">
                                  {{ r5.username?.charAt(0)?.toUpperCase() || '?' }}
                                </div>
                                <div class="user-info">
                                  <span class="username">{{ r5.username }}</span>
                                  <span class="comment-time">{{ formatDate(r5.createdAt) }}</span>
                                </div>
                              </div>
                              <div class="comment-content">
                                <span v-if="r5.replyToUsername" class="reply-to">
                                  回复 @{{ r5.replyToUsername }}：
                                </span>
                                {{ r5.content }}
                              </div>
                              <div class="reply-actions">
                                <span class="action-btn" @click="handleLike(r5)">
                                  {{ r5.likeCount > 0 ? `👍 ${r5.likeCount}` : '👍' }}
                                </span>
                                <span class="action-btn" @click="startReply(r5)">回复</span>
                                <span
                                  v-if="currentUser?.userId === r5.userId"
                                  class="action-btn delete"
                                  @click="handleDelete(r5)"
                                >
                                  删除
                                </span>
                              </div>

                              <div v-if="isInlineReplyBoxVisible(r5)" class="inline-reply-box nested">
                                <div class="inline-reply-header">
                                  <px-text size="13">回复 @{{ replyTarget.username }}</px-text>
                                  <span class="close-btn" @click="cancelReply">×</span>
                                </div>
                                <el-input
                                  v-model="newComment.content"
                                  type="textarea"
                                  :rows="2"
                                  placeholder="写下你的回复..."
                                  maxlength="500"
                                  show-word-limit
                                  :disabled="submitting"
                                />
                                <div class="inline-reply-actions">
                                  <px-button
                                    plain
                                    size="small"
                                    :use-throttle="false"
                                    @click="cancelReply"
                                  >
                                    取消
                                  </px-button>
                                  <px-button
                                    type="primary"
                                    size="small"
                                    :loading="submitting"
                                    :use-throttle="false"
                                    @click="submitComment"
                                  >
                                    发表回复
                                  </px-button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </px-card>
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
    </section>
  </main>
</template>

<style scoped>
.comment-page {
  min-height: 100vh;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background:
    linear-gradient(180deg, rgba(235, 240, 248, 0.96), rgba(242, 236, 226, 0.94)),
    radial-gradient(circle at top right, rgba(93, 62, 240, 0.08), transparent 30%),
    radial-gradient(circle at bottom left, rgba(47, 133, 90, 0.08), transparent 28%);
}

.comment-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
}

.comment-title {
  margin: 12px 0 6px;
  color: #213547;
  font-size: clamp(1.6rem, 3vw, 2.4rem);
}

.comment-subtitle {
  margin: 0;
  color: #6b7f87;
  font-size: 14px;
}

.comment-input-section {
  margin-bottom: 24px;
}

.input-card {
  max-width: 800px;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.login-tip {
  margin-bottom: 24px;
  max-width: 800px;
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
  gap: 16px;
  max-width: 800px;
}

.empty-tip {
  text-align: center;
  padding: 60px 0;
}

.comment-card {
  padding: 16px;
}

.comment-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.comment-user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c4dff, #5d3ef0);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.avatar-placeholder.small {
  width: 28px;
  height: 28px;
  font-size: 13px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  color: #213547;
  font-weight: 600;
  font-size: 14px;
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
  color: #6b7f87;
  cursor: pointer;
  font-size: 13px;
  transition: color 0.15s;
}

.action-btn:hover {
  color: #7c4dff;
}

.action-btn.delete:hover {
  color: #e53e3e;
}

.comment-content {
  color: #385b66;
  line-height: 1.7;
  margin-bottom: 8px;
  padding-left: 46px;
}

.reply-to {
  color: #7c4dff;
  font-weight: 500;
}

.comment-status.pending {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(237, 137, 54, 0.12);
  color: #dd6b20;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.reply-list {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(56, 91, 102, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-list.nested {
  margin-top: 12px;
  padding-top: 12px;
  padding-left: 20px;
  border-top: none;
  border-left: 2px solid rgba(124, 77, 255, 0.15);
}

.reply-list.nested .reply-list.nested {
  padding-left: 16px;
}

.reply-item {
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
}

.reply-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.reply-actions {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  padding-left: 38px;
}

.reply-item .comment-content {
  padding-left: 38px;
}

.pager-wrapper {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.inline-reply-box {
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  border: 1px solid rgba(124, 77, 255, 0.2);
}

.inline-reply-box.nested {
  margin-left: 38px;
}

.inline-reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.close-btn {
  color: #9ca3af;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: color 0.15s;
}

.close-btn:hover {
  color: #e53e3e;
}

.inline-reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .comment-page {
    padding: 16px;
  }

  .comment-content,
  .reply-item .comment-content {
    padding-left: 0;
    margin-top: 8px;
  }

  .reply-actions {
    padding-left: 0;
  }

  .comment-meta {
    flex-direction: column;
  }
}
</style>
