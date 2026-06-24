<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PxMessage } from '@mmt817/pixel-ui'
import {
  createChatGroup,
  getChatGroups,
  getChatGroup,
  getGroupMembers,
  getGroupMessages,
  sendGroupMessage,
  deleteMessage,
  joinGroup,
  leaveGroup,
  getAccessToken,
  getCurrentUser,
} from '@/services/chat'

const router = useRouter()
const currentUser = computed(() => getCurrentUser())
const token = computed(() => getAccessToken())

const chatGroups = ref([])
const activeGroup = ref(null)
const messages = ref([])
const members = ref([])
const loading = ref(false)
const sending = ref(false)
const sidebarCollapsed = ref(false)

const newMessage = reactive({
  content: '',
  type: 1,
})

const newGroup = reactive({
  groupName: '',
  groupType: 'group',
  isPublic: 'public',
  memberIds: [],
})

const showCreateModal = ref(false)
const showMemberModal = ref(false)
const activeTab = ref('chat')

onMounted(() => {
  loadGroups()
})

async function loadGroups() {
  loading.value = true
  try {
    const result = await getChatGroups(token.value)
    chatGroups.value = result?.data || []
  } catch (error) {
    PxMessage.error(error?.message || '加载群组列表失败')
  } finally {
    loading.value = false
  }
}

async function selectGroup(group) {
  activeGroup.value = group
  messages.value = []
  members.value = []
  await Promise.all([loadGroupMessages(), loadGroupMembers()])
}

async function loadGroupMessages() {
  if (!activeGroup.value) return
  loading.value = true
  try {
    const result = await getGroupMessages(activeGroup.value.group_id, { page: 1, size: 50 }, token.value)
    messages.value = result?.data || []
  } catch (error) {
    PxMessage.error(error?.message || '加载消息失败')
  } finally {
    loading.value = false
  }
}

async function loadGroupMembers() {
  if (!activeGroup.value) return
  try {
    const result = await getGroupMembers(activeGroup.value.group_id, token.value)
    members.value = result?.data || []
  } catch (error) {
    console.error('Failed to load members:', error)
  }
}

async function handleSendMessage() {
  if (!newMessage.content.trim() || !activeGroup.value) return

  sending.value = true
  try {
    const payload = {
      messageType: newMessage.type,
      content: newMessage.content.trim(),
    }
    const result = await sendGroupMessage(activeGroup.value.group_id, payload, token.value)
    messages.value.push(result?.data)
    newMessage.content = ''
  } catch (error) {
    PxMessage.error(error?.message || '发送消息失败')
  } finally {
    sending.value = false
  }
}

async function handleDeleteMessage(messageId) {
  try {
    await deleteMessage(messageId, token.value)
    messages.value = messages.value.filter((m) => m.message_id !== messageId)
    PxMessage.success('消息已删除')
  } catch (error) {
    PxMessage.error(error?.message || '删除消息失败')
  }
}

async function handleCreateGroup() {
  if (!newGroup.groupName.trim()) {
    PxMessage.warning('请输入群组名称')
    return
  }

  try {
    await createChatGroup(
      {
        groupName: newGroup.groupName.trim(),
        groupType: newGroup.groupType,
        isPublic: newGroup.isPublic,
        memberIds: newGroup.memberIds,
      },
      token.value
    )
    PxMessage.success('群组创建成功')
    showCreateModal.value = false
    newGroup.groupName = ''
    newGroup.groupType = 'group'
    newGroup.isPublic = 'public'
    newGroup.memberIds = []
    await loadGroups()
  } catch (error) {
    PxMessage.error(error?.message || '创���群组失败')
  }
}

async function handleJoinGroup(groupId) {
  try {
    await joinGroup(groupId, token.value)
    PxMessage.success('加入群组成功')
    await loadGroups()
  } catch (error) {
    PxMessage.error(error?.message || '加入群组失败')
  }
}

async function handleLeaveGroup() {
  if (!activeGroup.value) return

  try {
    await leaveGroup(activeGroup.value.group_id, token.value)
    PxMessage.success('已退出群组')
    activeGroup.value = null
    messages.value = []
    members.value = []
    await loadGroups()
  } catch (error) {
    PxMessage.error(error?.message || '退出群组失败')
  }
}

function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}

function getMemberRole(role) {
  const roles = { 1: '成员', 2: '管理员', 3: '群主' }
  return roles[role] || '成员'
}

function isMessageOwner(message) {
  return currentUser.value?.userId === message.sender_id
}

function goBack() {
  router.push('/welcome')
}
</script>

<template>
  <main class="chat-page">
    <section class="chat-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <px-text size="14" weight="bold">聊天室</px-text>
        <div class="sidebar-actions">
          <px-button type="primary" size="small" @click="showCreateModal = true">+ 创建</px-button>
          <px-button size="small" plain @click="sidebarCollapsed = !sidebarCollapsed">
            <px-icon :icon="sidebarCollapsed ? 'angle-right' : 'angle-left'" />
          </px-button>
        </div>
      </div>

      <div class="group-list">
        <div
          v-for="group in chatGroups"
          :key="group.group_id"
          class="group-item"
          :class="{ active: activeGroup?.group_id === group.group_id }"
          @click="selectGroup(group)"
        >
          <div class="group-avatar">
            <px-icon icon="users-solid" size="20" />
          </div>
          <div class="group-info">
            <px-text size="13" weight="bold">{{ group.group_name }}</px-text>
            <px-text size="11" class="group-meta">
              {{ group.group_type === 1 ? '群组' : '私聊' }} · {{ group.member_count || 0 }}人
            </px-text>
          </div>
        </div>

        <div v-if="chatGroups.length === 0 && !loading" class="empty-tip">
          <px-text size="12">暂无聊天室</px-text>
          <px-button size="small" type="primary" @click="showCreateModal = true">创建群组</px-button>
        </div>

        <div v-if="loading" class="loading-tip">
          <px-icon icon="spinner" spin size="18" />
        </div>
      </div>

      <div class="sidebar-footer">
        <px-button plain size="small" @click="goBack">返回首页</px-button>
      </div>
    </section>

    <section class="chat-main">
      <template v-if="activeGroup">
        <div class="chat-header">
          <div class="header-info">
            <px-text size="16" weight="bold">{{ activeGroup.group_name }}</px-text>
            <px-text size="12" class="header-meta">
              {{ activeGroup.group_type === 1 ? '群组' : '私聊' }} ·
              {{ members.length }}人
            </px-text>
          </div>
          <div class="header-actions">
            <px-button size="small" plain @click="showMemberModal = true">成员</px-button>
            <px-button size="small" type="danger" plain @click="handleLeaveGroup">退群</px-button>
          </div>
        </div>

        <div class="chat-tabs">
          <button class="tab-button" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
            聊天
          </button>
          <button class="tab-button" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">
            详情
          </button>
        </div>

        <div v-if="activeTab === 'chat'" class="chat-content">
          <div v-loading.grid="loading" class="message-list">
            <div v-for="message in messages" :key="message.message_id" class="message-item" :class="{ own: isMessageOwner(message) }">
              <div class="message-avatar">
                <px-icon icon="user-solid" size="18" />
              </div>
              <div class="message-body">
                <div class="message-header">
                  <px-text size="12" weight="bold">{{ message.sender_username }}</px-text>
                  <px-text size="11" class="message-time">{{ formatTime(message.created_at) }}</px-text>
                </div>
                <div class="message-content">
                  <template v-if="message.message_type === 1">{{ message.content }}</template>
                  <template v-else-if="message.message_type === 2">
                    <img :src="message.file_url" alt="图片" class="message-image" />
                  </template>
                  <template v-else-if="message.message_type === 3">
                    <a :href="message.file_url" target="_blank" class="message-file">
                      <px-icon icon="file-solid" size="16" />
                      <span>{{ message.file_name }}</span>
                      <span class="file-size">({{ Math.round(message.file_size / 1024) }}KB)</span>
                    </a>
                  </template>
                </div>
              </div>
              <div v-if="isMessageOwner(message)" class="message-actions">
                <px-button size="tiny" type="danger" plain @click="handleDeleteMessage(message.message_id)">删除</px-button>
              </div>
            </div>

            <div v-if="messages.length === 0 && !loading" class="empty-tip">
              <px-text size="12">暂无消息，开始聊天吧</px-text>
            </div>
          </div>

          <div class="chat-input">
            <px-input
              v-model="newMessage.content"
              placeholder="输入消息..."
              @keyup.enter="handleSendMessage"
            />
            <px-button type="primary" :loading="sending" @click="handleSendMessage">发送</px-button>
          </div>
        </div>

        <div v-else class="group-info-panel">
          <div class="info-section">
            <px-text size="14" weight="bold">群组名称</px-text>
            <px-text size="13">{{ activeGroup.group_name }}</px-text>
          </div>
          <div class="info-section">
            <px-text size="14" weight="bold">创建时间</px-text>
            <px-text size="13">{{ formatDate(activeGroup.created_at) }}</px-text>
          </div>
          <div class="info-section">
            <px-text size="14" weight="bold">成员列表 ({{ members.length }})</px-text>
            <div class="member-list">
              <div v-for="member in members" :key="member.user_id" class="member-item">
                <px-icon icon="user-solid" size="14" />
                <span>{{ member.username }}</span>
                <px-tag v-if="member.role === 3" type="warning">群主</px-tag>
                <px-tag v-else-if="member.role === 2" type="info">管理员</px-tag>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="chat-empty">
        <px-icon icon="comments-solid" size="48" color="#ccc" />
        <px-text size="14">选择一个聊天室开始聊天</px-text>
        <px-button type="primary" @click="showCreateModal = true">创建群组</px-button>
      </div>
    </section>

    <px-dialog v-model="showCreateModal" title="创建群组" width="420px">
      <div class="create-form">
        <label class="field-block">
          <span class="field-label">群组名称</span>
          <px-input v-model="newGroup.groupName" placeholder="输入群组名称" />
        </label>
        <label class="field-block">
          <span class="field-label">类型</span>
          <div class="radio-group">
            <label class="radio-item">
              <input v-model="newGroup.groupType" type="radio" value="group" />
              <span>群组</span>
            </label>
            <label class="radio-item">
              <input v-model="newGroup.groupType" type="radio" value="private" />
              <span>私聊</span>
            </label>
          </div>
        </label>
        <label class="field-block">
          <span class="field-label">可见性</span>
          <div class="radio-group">
            <label class="radio-item">
              <input v-model="newGroup.isPublic" type="radio" value="public" />
              <span>公开</span>
            </label>
            <label class="radio-item">
              <input v-model="newGroup.isPublic" type="radio" value="private" />
              <span>私密</span>
            </label>
          </div>
        </label>
      </div>
      <template #footer>
        <px-button plain @click="showCreateModal = false">取消</px-button>
        <px-button type="primary" @click="handleCreateGroup">创建</px-button>
      </template>
    </px-dialog>

    <px-dialog v-model="showMemberModal" title="群成员" width="480px">
      <div class="member-modal-list">
        <div v-for="member in members" :key="member.user_id" class="member-modal-item">
          <div class="member-avatar">
            <px-icon icon="user-solid" size="18" />
          </div>
          <div class="member-info">
            <px-text size="13" weight="bold">{{ member.username }}</px-text>
            <px-text size="11">{{ member.email }}</px-text>
          </div>
          <px-tag v-if="member.role === 3" type="warning">群主</px-tag>
          <px-tag v-else-if="member.role === 2" type="info">管理员</px-tag>
        </div>
      </div>
    </px-dialog>
  </main>
</template>

<style scoped>
.chat-page {
  min-height: 100vh;
  display: flex;
  background:
    linear-gradient(180deg, rgba(247, 244, 239, 0.82), rgba(224, 235, 247, 0.82)),
    radial-gradient(circle at top left, #f9d8d6 0, transparent 28%),
    radial-gradient(circle at bottom right, #c7f0d8 0, transparent 24%),
    #ebe6e0;
}

.chat-sidebar {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.88);
  border-right: 1px solid rgba(56, 91, 102, 0.12);
}

.chat-sidebar.collapsed {
  width: 60px;
  min-width: 60px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.12);
}

.sidebar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.group-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.group-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.18s ease;
}

.group-item:hover {
  background: rgba(56, 91, 102, 0.06);
}

.group-item.active {
  background: rgba(93, 62, 240, 0.1);
}

.group-avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(56, 91, 102, 0.08);
}

.group-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.group-meta {
  color: #6b7f87;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(56, 91, 102, 0.12);
  text-align: center;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(56, 91, 102, 0.12);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-meta {
  color: #6b7f87;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.chat-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.72);
}

.tab-button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #385b66;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tab-button:hover {
  background: rgba(56, 91, 102, 0.06);
}

.tab-button.active {
  background: #5d3ef0;
  color: #fff;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-item.own {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(56, 91, 102, 0.1);
  flex-shrink: 0;
}

.message-body {
  flex: 1;
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-item.own .message-body {
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-time {
  color: #6b7f87;
}

.message-content {
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(56, 91, 102, 0.12);
  line-height: 1.6;
}

.message-item.own .message-content {
  background: rgba(93, 62, 240, 0.12);
  border-color: rgba(93, 62, 240, 0.2);
}

.message-image {
  max-width: 240px;
  max-height: 320px;
  border-radius: 8px;
}

.message-file {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5d3ef0;
  text-decoration: none;
}

.file-size {
  color: #6b7f87;
  font-size: 12px;
}

.message-actions {
  opacity: 0;
  transition: opacity 0.18s ease;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.88);
  border-top: 1px solid rgba(56, 91, 102, 0.12);
}

.chat-input .px-input {
  flex: 1;
}

.group-info-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.12);
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.loading-tip {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: #385b66;
  font-weight: 700;
}

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-modal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-modal-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(56, 91, 102, 0.06);
}

.member-modal-item .member-avatar {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(56, 91, 102, 0.1);
}

.member-modal-item .member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

@media (max-width: 768px) {
  .chat-page {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100%;
    min-width: 100%;
    max-height: 45vh;
  }

  .chat-sidebar.collapsed {
    width: 100%;
    min-width: 100%;
  }
}
</style>