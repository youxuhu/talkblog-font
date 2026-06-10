<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PxMessage } from '@mmt817/pixel-ui'
import {
  createChatGroup,
  getChatGroups,
  getPublicChatGroups,
  searchChatGroups,
  getChatGroup,
  getGroupMembers,
  getGroupMessages,
  sendGroupMessage,
  deleteMessage,
  recallMessage,
  joinGroup,
  leaveGroup,
  applyJoinGroup,
  getGroupJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getMyJoinRequests,
  updateGroupSettings,
  getAccessToken,
  getCurrentUser,
} from '@/services/chat'

const router = useRouter()
const currentUser = computed(() => getCurrentUser())
const token = computed(() => getAccessToken())

const ws = ref(null)
const wsConnected = ref(false)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const chatGroups = ref([])
const publicGroups = ref([])
const activeGroup = ref(null)
const messages = ref([])
const members = ref([])
const loading = ref(false)
const sending = ref(false)
const sidebarWidth = ref(280)
const isResizing = ref(false)
const MIN_SIDEBAR = 60
const MAX_SIDEBAR = 500

function startResize(e) {
  isResizing.value = true
  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

function doResize(e) {
  if (!isResizing.value) return
  sidebarWidth.value = Math.min(Math.max(e.clientX, MIN_SIDEBAR), MAX_SIDEBAR)
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
})
const showPublicTab = ref(false)

const searchKeyword = ref('')
const searchResults = ref([])
const showSearch = ref(false)
const joinRequests = ref([])
const showRequestsModal = ref(false)
const myRequests = ref([])
const showMyRequestsModal = ref(false)
const showSettingsModal = ref(false)
const editSettings = reactive({
  groupType: 1,
  isPublic: 1,
})
const showEmojiPicker = ref(false)
const emojiBtnRef = ref(null)
const emojiPanelRef = ref(null)
const emojiList = ['😀','😂','🤣','😍','🥰','😎','🤩','😢','😡','👍','👎','🎉','❤️','🔥','💯','✅','❌','⭐','🙏','💪','🤝','👋','🎂','🎁','💡','📌','🎯','🚀','💻','📱','💰','🔒','🔓','⚠️','❓','❗','➕','➖','✔️','✖️','🔄','🔝','💬','👀','🫡','🍻','🎶','🏆','🕐','🥹','😤','🤗','🤔','😴','🥶','🤯','🥳','😱','🤬']

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
  connectWebSocket()
  document.addEventListener('click', handleEmojiClickOutside)
})

onBeforeUnmount(() => {
  disconnectWebSocket()
  document.removeEventListener('click', handleEmojiClickOutside)
})

function connectWebSocket() {
  if (!token.value || ws.value) return

  const wsUrl = API_BASE.replace(/^http/, 'ws') + `/ws/chat?token=${token.value}`

  try {
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      wsConnected.value = true
    }

    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWsMessage(data)
      } catch (e) {
        console.error('WS message parse error:', e)
      }
    }

    ws.value.onclose = () => {
      wsConnected.value = false
      ws.value = null
      setTimeout(() => connectWebSocket(), 3000)
    }

    ws.value.onerror = () => {
      wsConnected.value = false
    }
  } catch (e) {
    console.error('WebSocket connection failed:', e)
  }
}

function disconnectWebSocket() {
  if (ws.value) {
    if (activeGroup.value) {
      ws.value.send(JSON.stringify({ type: 'leave_group', groupId: activeGroup.value.group_id }))
    }
    ws.value.close()
    ws.value = null
    wsConnected.value = false
  }
}

function handleWsMessage(data) {
  switch (data.type) {
    case 'authenticated':
      if (activeGroup.value) {
        ws.value?.send(JSON.stringify({ type: 'join_group', groupId: activeGroup.value.group_id }))
      }
      break
    case 'new_message':
      if (activeGroup.value && data.message.group_id === activeGroup.value.group_id) {
        const exists = messages.value.some(m => m.message_id === data.message.message_id)
        if (!exists) {
          messages.value.push(data.message)
        }
      }
      break
    case 'user_joined':
    case 'user_left':
      if (activeGroup.value && data.groupId === activeGroup.value.group_id) {
        loadGroupMembers()
      }
      break
    case 'user_typing':
      break
    case 'message_deleted':
      messages.value = messages.value.filter(m => m.message_id !== data.messageId)
      break
    case 'group_dismissed':
      if (activeGroup.value && data.groupId === activeGroup.value.group_id) {
        PxMessage.warning('群组已被管理员解散')
        activeGroup.value = null
        messages.value = []
        members.value = []
        loadGroups()
      }
      break
    case 'banned_from_group':
      if (activeGroup.value && data.groupId === activeGroup.value.group_id) {
        PxMessage.warning(data.reason ? `你已被禁言：${data.reason}` : '你已被移出群组')
        activeGroup.value = null
        messages.value = []
        members.value = []
        loadGroups()
      }
      break
  }
}

function sendWsMessage(msg) {
  if (ws.value && wsConnected.value) {
    ws.value.send(JSON.stringify(msg))
  }
}

async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(`${API_BASE}/api/chat/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
    })
    const result = await response.json()
    if (!response.ok || result?.success === false) {
      throw new Error(result?.message || '上传失败')
    }
    return result.data
  } catch (error) {
    PxMessage.error(error?.message || '文件上传失败')
    return null
  }
}

async function handleUploadFile(mediaType) {
  if (!activeGroup.value) return

  const input = document.createElement('input')
  input.type = 'file'
  if (mediaType === 'image') {
    input.accept = 'image/jpeg,image/png,image/gif,image/webp'
  } else {
    input.accept = '*'
  }

  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    sending.value = true
    try {
      const uploadResult = await uploadFile(file)
      if (!uploadResult) return

      const payload = {
        messageType: mediaType === 'image' ? 2 : 3,
        content: '',
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
      }
      const result = await sendGroupMessage(activeGroup.value.group_id, payload, token.value)
      if (result?.data) {
        messages.value.push(result.data)
      }
    } catch (error) {
      PxMessage.error(error?.message || '发送失败')
    } finally {
      sending.value = false
    }
    input.remove()
  }
  input.click()
}

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

async function loadPublicGroups() {
  try {
    const result = await getPublicChatGroups(token.value)
    publicGroups.value = result?.data || []
  } catch (error) {
    console.error('Failed to load public groups:', error)
  }
}

async function togglePublicTab() {
  showPublicTab.value = !showPublicTab.value
  if (showPublicTab.value) {
    publicGroups.value = []
    await loadPublicGroups()
  }
}

async function selectGroup(group) {
  if (activeGroup.value) {
    sendWsMessage({ type: 'leave_group', groupId: activeGroup.value.group_id })
  }
  activeGroup.value = group
  messages.value = []
  members.value = []
  sendWsMessage({ type: 'join_group', groupId: group.group_id })
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

async function handleRecallMessage(messageId) {
  try {
    await recallMessage(messageId, token.value)
    const msg = messages.value.find((m) => m.message_id === messageId)
    if (msg) {
      msg.is_recalled = 1
      msg.content = ''
    }
    PxMessage.success('消息已撤回')
  } catch (error) {
    PxMessage.error(error?.message || '撤回消息失败')
  }
}

function canRecall(message) {
  if (!message.created_at) return false
  const now = Date.now()
  const created = new Date(message.created_at).getTime()
  return now - created < 60000
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

async function handleSearch() {
  if (!searchKeyword.value.trim()) return
  try {
    const result = await searchChatGroups(searchKeyword.value.trim(), token.value)
    searchResults.value = result?.data || []
  } catch (error) {
    PxMessage.error(error?.message || '搜索失败')
  }
}

async function handleSearchJoin(groupId) {
  try {
    await joinGroup(groupId, token.value)
    PxMessage.success('加入群组成功')
    searchKeyword.value = ''
    searchResults.value = []
    showSearch.value = false
    await loadGroups()
  } catch (error) {
    PxMessage.error(error?.message || '加入群组失败')
  }
}

async function handleSearchApply(groupId) {
  try {
    await applyJoinGroup(groupId, {}, token.value)
    PxMessage.success('申请已提交，等待群主审核')
  } catch (error) {
    PxMessage.error(error?.message || '申请失败')
  }
}

async function loadPendingRequests() {
  if (!activeGroup.value) return
  try {
    const result = await getGroupJoinRequests(activeGroup.value.group_id, token.value)
    joinRequests.value = result?.data || []
  } catch (error) {
    console.error('Failed to load requests:', error)
  }
}

async function handleApprove(requestId) {
  if (!activeGroup.value) return
  try {
    await approveJoinRequest(activeGroup.value.group_id, requestId, token.value)
    PxMessage.success('已通过')
    await loadPendingRequests()
  } catch (error) {
    PxMessage.error(error?.message || '操作失败')
  }
}

async function handleReject(requestId) {
  if (!activeGroup.value) return
  try {
    await rejectJoinRequest(activeGroup.value.group_id, requestId, token.value)
    PxMessage.success('已拒绝')
    await loadPendingRequests()
  } catch (error) {
    PxMessage.error(error?.message || '操作失败')
  }
}

async function openRequestsModal() {
  await loadPendingRequests()
  showRequestsModal.value = true
}

async function loadMyRequests() {
  try {
    const result = await getMyJoinRequests(token.value)
    myRequests.value = result?.data || []
  } catch (error) {
    console.error('Failed to load my requests:', error)
  }
}

async function openMyRequestsModal() {
  await loadMyRequests()
  showMyRequestsModal.value = true
}

function isGroupOwnerOrAdmin() {
  if (!activeGroup.value || !currentUser.value) return false
  const member = members.value.find(m => m.user_id === currentUser.value.userId)
  return member && (member.role === 3 || member.role === 2)
}

function isGroupOwner() {
  if (!activeGroup.value || !currentUser.value) return false
  const member = members.value.find(m => m.user_id === currentUser.value.userId)
  return member && member.role === 3
}

function openSettingsModal() {
  editSettings.groupType = activeGroup.value.group_type
  editSettings.isPublic = activeGroup.value.is_public
  showSettingsModal.value = true
}

async function handleUpdateSettings() {
  try {
    await updateGroupSettings(
      activeGroup.value.group_id,
      {
        groupType: editSettings.groupType,
        isPublic: editSettings.isPublic,
      },
      token.value
    )
    activeGroup.value.group_type = editSettings.groupType
    activeGroup.value.is_public = editSettings.isPublic
    showSettingsModal.value = false
    PxMessage.success('群组设置已更新')
  } catch (error) {
    PxMessage.error(error?.message || '更新设置失败')
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

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
}

function insertEmoji(emoji) {
  newMessage.content += emoji
  showEmojiPicker.value = false
}

function handleEmojiClickOutside(e) {
  const btn = emojiBtnRef.value
  const panel = emojiPanelRef.value
  if (!showEmojiPicker.value) return
  if (btn && btn.contains(e.target)) return
  if (panel && panel.contains(e.target)) return
  showEmojiPicker.value = false
}

function resolveFileUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return API_BASE + url
}

const previewImageUrl = ref(null)

function openImagePreview(url) {
  previewImageUrl.value = resolveFileUrl(url)
}

function closeImagePreview() {
  previewImageUrl.value = null
}

function goBack() {
  router.push('/welcome')
}
</script>

<template>
  <main class="chat-page">
    <section class="chat-sidebar" :style="{ width: sidebarWidth + 'px' }">
      <div class="sidebar-header">
        <px-text size="14" weight="bold">聊天室</px-text>
        <div class="sidebar-actions">
          <px-button type="primary" size="small" @click="showCreateModal = true">+ 创建</px-button>
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

      <div class="sidebar-divider">
        <px-button size="small" plain @click="togglePublicTab">
          <px-icon :icon="showPublicTab ? 'angle-down' : 'angle-right'" />
          <span>发现公开群组</span>
        </px-button>
      </div>

      <div v-if="showPublicTab" class="group-list public-list">
        <div
          v-for="group in publicGroups"
          :key="'pub-'+group.group_id"
          class="group-item"
        >
          <div class="group-avatar">
            <px-icon icon="users-solid" size="20" />
          </div>
          <div class="group-info">
            <px-text size="13" weight="bold">{{ group.group_name }}</px-text>
            <px-text size="11" class="group-meta">
              {{ group.group_type === 1 ? '群组' : '私聊' }} · {{ group.member_count || 0 }}人 · 创建者:{{ group.owner_name }}
            </px-text>
          </div>
          <px-button size="tiny" type="primary" @click="handleJoinGroup(group.group_id)">加入</px-button>
        </div>
        <div v-if="publicGroups.length === 0" class="empty-tip">
          <px-text size="12">暂无其他公开群组</px-text>
        </div>
      </div>

      <div class="sidebar-divider">
        <px-button size="small" plain @click="showSearch = !showSearch">
          <px-icon :icon="showSearch ? 'angle-down' : 'angle-right'" />
          <span>搜索群组</span>
        </px-button>
      </div>

      <div v-if="showSearch" class="apply-section">
        <div class="search-row">
          <px-input v-model="searchKeyword" placeholder="输入群组名称或ID" size="small" @keyup.enter="handleSearch" />
          <px-button size="small" type="primary" @click="handleSearch">搜索</px-button>
        </div>
        <div v-if="searchResults.length > 0" class="search-results">
          <div v-for="group in searchResults" :key="'s-'+group.group_id" class="group-item">
            <div class="group-avatar">
              <px-icon icon="users-solid" size="20" />
            </div>
            <div class="group-info">
              <px-text size="13" weight="bold">{{ group.group_name }}</px-text>
              <px-text size="11" class="group-meta">
                {{ group.group_type === 1 ? '群组' : '私聊' }} ·
                {{ group.member_count || 0 }}人 ·
                创建者:{{ group.owner_name }}
                <px-tag v-if="group.is_public === 1" size="small" type="primary">公开</px-tag>
                <px-tag v-else size="small" type="info">私密</px-tag>
              </px-text>
            </div>
            <px-button v-if="group.is_public === 1" size="tiny" type="primary" @click="handleSearchJoin(group.group_id)">加入</px-button>
            <px-button v-else size="tiny" type="primary" @click="handleSearchApply(group.group_id)">申请</px-button>
          </div>
        </div>
        <div v-else-if="searchKeyword && !searchResults.length" class="empty-tip">
          <px-text size="12">没找到群组</px-text>
        </div>
      </div>

      <div class="sidebar-footer">
        <px-button plain size="small" @click="openMyRequestsModal">我的申请</px-button>
        <px-button plain size="small" @click="goBack">返回首页</px-button>
      </div>
    </section>

    <div
      class="resize-handle"
      :class="{ resizing: isResizing }"
      @mousedown="startResize"
    ></div>

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
            <px-button v-if="isGroupOwnerOrAdmin()" size="small" plain @click="openRequestsModal">审批</px-button>
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
                  <template v-if="message.is_recalled === 1">
                    <span class="recalled-text">消息已撤回</span>
                  </template>
                  <template v-else-if="message.message_type === 1">{{ message.content }}</template>
                  <template v-else-if="message.message_type === 2">
                    <img :src="resolveFileUrl(message.file_url)" alt="图片" class="message-image" @click="openImagePreview(message.file_url)" />
                  </template>
                  <template v-else-if="message.message_type === 3">
                    <a :href="resolveFileUrl(message.file_url)" target="_blank" rel="noopener noreferrer" class="message-file">
                      <px-icon icon="file-solid" size="16" />
                      <span>{{ message.file_name }}</span>
                      <span class="file-size">({{ Math.round(message.file_size / 1024) }}KB)</span>
                    </a>
                  </template>
                </div>
              </div>
              <div v-if="isMessageOwner(message) && message.is_recalled !== 1" class="message-actions">
                <px-button v-if="canRecall(message)" size="tiny" type="primary" plain @click="handleRecallMessage(message.message_id)">撤回</px-button>
                <px-button size="tiny" type="danger" plain @click="handleDeleteMessage(message.message_id)">删除</px-button>
              </div>
            </div>

            <div v-if="messages.length === 0 && !loading" class="empty-tip">
              <px-text size="12">暂无消息，开始聊天吧</px-text>
            </div>
          </div>

          <div class="chat-input">
            <div class="emoji-btn" ref="emojiBtnRef" @click.stop="toggleEmojiPicker">😊</div>
            <label class="file-btn" title="发送图片">
              <px-icon icon="image-solid" size="18" />
              <input type="file" accept="image/*" hidden @change="handleUploadFile('image')" />
            </label>
            <label class="file-btn" title="发送文件">
              <px-icon icon="file-solid" size="18" />
              <input type="file" hidden @change="handleUploadFile('file')" />
            </label>
            <px-input
              v-model="newMessage.content"
              placeholder="输入消息..."
              @keyup.enter="handleSendMessage"
              @focus="sendWsMessage({ type: 'typing', groupId: activeGroup.group_id, isTyping: true })"
              @blur="sendWsMessage({ type: 'typing', groupId: activeGroup.group_id, isTyping: false })"
            />
            <px-button type="primary" :loading="sending" @click="handleSendMessage">发送</px-button>
            <div v-if="showEmojiPicker" class="emoji-picker" ref="emojiPanelRef">
              <span v-for="emoji in emojiList" :key="emoji" class="emoji-item" @click="insertEmoji(emoji)">{{ emoji }}</span>
            </div>
          </div>
        </div>

        <div v-else class="group-info-panel">
          <div class="info-section">
            <px-text size="14" weight="bold">群组ID</px-text>
            <px-text size="13">{{ activeGroup.group_id }}</px-text>
          </div>
          <div class="info-section">
            <px-text size="14" weight="bold">群组名称</px-text>
            <px-text size="13">{{ activeGroup.group_name }}</px-text>
          </div>
          <div class="info-section">
            <px-text size="14" weight="bold">群组类型</px-text>
            <px-text size="13">{{ activeGroup.group_type === 1 ? '群组' : '私聊' }}</px-text>
          </div>
          <div class="info-section">
            <px-text size="14" weight="bold">可见性</px-text>
            <px-text size="13">{{ activeGroup.is_public === 1 ? '公开' : '私密' }}</px-text>
          </div>
          <div class="info-section">
            <px-text size="14" weight="bold">创建时间</px-text>
            <px-text size="13">{{ formatDate(activeGroup.created_at) }}</px-text>
          </div>
          <div v-if="isGroupOwner()" class="info-section">
            <px-button size="small" type="primary" plain @click="openSettingsModal">编辑设置</px-button>
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

    <el-dialog v-model="showCreateModal" title="创建群组" width="420px">
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
    </el-dialog>

    <el-dialog v-model="showMemberModal" title="群成员" width="480px">
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
    </el-dialog>

    <el-dialog v-model="showRequestsModal" title="加入申请审批" width="480px">
      <div v-if="joinRequests.length === 0" class="empty-tip">
        <px-text size="12">暂无待处理的申请</px-text>
      </div>
      <div v-for="req in joinRequests" :key="req.id" class="request-item">
        <div class="request-info">
          <px-text size="13" weight="bold">{{ req.username }}</px-text>
          <px-text v-if="req.reason" size="11">理由：{{ req.reason }}</px-text>
          <px-text size="11">申请时间：{{ formatTime(req.created_at) }}</px-text>
          <px-tag v-if="req.status === 1" type="success">已通过</px-tag>
          <px-tag v-else-if="req.status === 2" type="danger">已拒绝</px-tag>
        </div>
        <div v-if="req.status === 0" class="request-actions">
          <px-button size="tiny" type="primary" @click="handleApprove(req.id)">通过</px-button>
          <px-button size="tiny" type="danger" plain @click="handleReject(req.id)">拒绝</px-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showMyRequestsModal" title="我的申请记录" width="480px">
      <div v-if="myRequests.length === 0" class="empty-tip">
        <px-text size="12">暂无申请记录</px-text>
      </div>
      <div v-for="req in myRequests" :key="req.id" class="request-item">
        <div class="request-info">
          <px-text size="13" weight="bold">群ID: {{ req.group_id }}</px-text>
          <px-text v-if="req.reason" size="11">理由：{{ req.reason }}</px-text>
          <px-text size="11">申请时间：{{ formatTime(req.created_at) }}</px-text>
          <px-tag v-if="req.status === 0" type="warning">待审批</px-tag>
          <px-tag v-else-if="req.status === 1" type="success">已通过</px-tag>
          <px-tag v-else-if="req.status === 2" type="danger">已拒绝</px-tag>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showSettingsModal" title="编辑群组设置" width="420px">
      <div class="create-form">
        <label class="field-block">
          <span class="field-label">群组类型</span>
          <div class="radio-group">
            <label class="radio-item">
              <input v-model="editSettings.groupType" type="radio" :value="1" />
              <span>群组</span>
            </label>
            <label class="radio-item">
              <input v-model="editSettings.groupType" type="radio" :value="2" />
              <span>私聊</span>
            </label>
          </div>
        </label>
        <label class="field-block">
          <span class="field-label">可见性</span>
          <div class="radio-group">
            <label class="radio-item">
              <input v-model="editSettings.isPublic" type="radio" :value="1" />
              <span>公开</span>
            </label>
            <label class="radio-item">
              <input v-model="editSettings.isPublic" type="radio" :value="2" />
              <span>私密</span>
            </label>
          </div>
        </label>
      </div>
      <template #footer>
        <px-button plain @click="showSettingsModal = false">取消</px-button>
        <px-button type="primary" @click="handleUpdateSettings">保存</px-button>
      </template>
    </el-dialog>

    <div v-if="previewImageUrl" class="image-preview-overlay" @click.self="closeImagePreview">
      <button class="preview-close" @click="closeImagePreview">✕</button>
      <img :src="previewImageUrl" class="preview-image" @click.stop />
    </div>
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
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.88);
  border-right: 1px solid rgba(56, 91, 102, 0.12);
  min-width: 60px;
  max-width: 500px;
  overflow: hidden;
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

.resize-handle {
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.18s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.resize-handle:hover,
.resize-handle.resizing {
  background: rgba(93, 62, 240, 0.2);
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 32px;
  border-radius: 2px;
  background: rgba(56, 91, 102, 0.15);
  transition: background 0.18s ease;
}

.resize-handle:hover::after,
.resize-handle.resizing::after {
  background: rgba(93, 62, 240, 0.4);
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
  cursor: zoom-in;
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

.recalled-text {
  color: #6b7f87;
  font-style: italic;
  font-size: 13px;
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

.emoji-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 20px;
  border-radius: 8px;
  flex-shrink: 0;
  user-select: none;
}

.emoji-btn:hover {
  background: rgba(56, 91, 102, 0.08);
}

.file-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  cursor: pointer;
  border-radius: 8px;
  flex-shrink: 0;
  user-select: none;
  color: #385b66;
}

.file-btn:hover {
  background: rgba(56, 91, 102, 0.08);
}

.chat-input {
  position: relative;
}

.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  width: 320px;
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px;
  background: #fff;
  border: 1px solid rgba(56, 91, 102, 0.15);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  z-index: 100;
}

.emoji-item {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  font-size: 22px;
  cursor: pointer;
  border-radius: 6px;
}

.emoji-item:hover {
  background: rgba(93, 62, 240, 0.1);
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

.sidebar-divider {
  padding: 4px 12px;
  border-top: 1px solid rgba(56, 91, 102, 0.12);
}

.sidebar-divider .px-button {
  width: 100%;
  justify-content: flex-start;
  gap: 6px;
}

.public-list .group-item {
  cursor: default;
}

.public-list .group-item .px-button {
  flex-shrink: 0;
}

.apply-section {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid rgba(56, 91, 102, 0.12);
}

.search-row {
  display: flex;
  gap: 6px;
}

.search-row .px-input {
  flex: 1;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-results .group-item {
  cursor: default;
  padding: 6px 8px;
  border-radius: 8px;
}

.search-results .group-item:hover {
  background: rgba(56, 91, 102, 0.06);
}

.search-results .group-item .px-button {
  flex-shrink: 0;
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(56, 91, 102, 0.06);
  margin-bottom: 8px;
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.request-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.preview-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  cursor: default;
}

.preview-close {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 10000;
}

.preview-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .chat-page {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100% !important;
    min-width: 100% !important;
    max-height: 45vh;
  }

  .resize-handle {
    display: none;
  }
}
</style>