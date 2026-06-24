<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAccessToken, getCurrentUser } from '@/services/auth'
import { fetchMyChatrooms, fetchMessages, sendMessage, recallMessage, pinMessage, deleteMessage, fetchMyRole, transferOwnership, muteMember, unmuteMember } from '@/services/message'
import { fetchChatroomMembers, removeChatroomMember, updateMemberRole } from '@/services/chatroom'
import { censorText } from '@/config/sensitiveWords'

const router = useRouter()
const route = useRoute()
const currentUser = getCurrentUser()

const rooms = ref([])
const messages = ref([])
const currentRoom = ref(null)
const inputText = ref('')
const loading = ref(false)
const messagesLoading = ref(false)
const showSidebar = ref(true)
const messagesRef = ref(null)
const messageEndRef = ref(null)
const currentUserRole = ref('')
const mutedUntil = ref(null)
const muteDialogVisible = ref(false)
const muteTargetMember = ref(null)
const muteDuration = ref(30)
const transferDialogVisible = ref(false)
const transferLoading = ref(false)
const memberOptions = ref([])
const memberSearchLoading = ref(false)
const targetUserId = ref('')
const pollingLock = ref(false)
const memberManageVisible = ref(false)
const manageMembers = ref([])
const manageMembersLoading = ref(false)
const kickOnlyMode = ref(false)

let pollTimer = null

const ROLE_OWNER = 'OWNER'
const ROLE_ADMIN = 'ADMIN'

function isManager() {
  return currentUserRole.value === ROLE_OWNER || currentUserRole.value === ROLE_ADMIN
}

function canRecall(msg) {
  if (isManager()) return true
  if (!isSelfMessage(msg)) return false
  const elapsed = Date.now() - new Date(msg.createdAt).getTime()
  return elapsed < 5 * 60 * 1000
}

function canPin() {
  return isManager()
}

function canDelete() {
  return isManager()
}

onMounted(async () => {
  await loadRooms()
  if (route.params.id) {
    const room = rooms.value.find(r => r.chatroomId == route.params.id)
    if (room) {
      selectRoom(room)
    } else {
      showSidebar.value = true
    }
  }
})

onBeforeUnmount(() => {
  stopPolling()
})

watch(() => route.params.id, async (newId) => {
  if (!newId) {
    goBack()
    return
  }
  const room = rooms.value.find(r => r.chatroomId == newId)
  if (room) {
    currentRoom.value = room
    showSidebar.value = false
    await loadMessages()
    startPolling()
  }
})

async function loadRooms() {
  loading.value = true
  try {
    const result = await fetchMyChatrooms(getAccessToken())
    rooms.value = result?.data?.list || []
  } catch {
    rooms.value = []
  } finally {
    loading.value = false
  }
}

async function selectRoom(room) {
  currentRoom.value = room
  showSidebar.value = false
  router.replace(`/chat/${room.chatroomId}`)
  await loadMyRole()
  await loadMessages()
  startPolling()
}

async function loadMyRole() {
  if (!currentRoom.value) return
  try {
    const res = await fetchMyRole(currentRoom.value.chatroomId, getAccessToken())
    currentUserRole.value = res?.data?.role || ''
    mutedUntil.value = res?.data?.mutedUntil || null
  } catch {
    currentUserRole.value = ''
    mutedUntil.value = null
  }
}

function goBack() {
  currentRoom.value = null
  showSidebar.value = true
  stopPolling()
  router.replace('/chat')
}

function toggleSidebar() {
  showSidebar.value = !showSidebar.value
}

async function loadMessages() {
  if (!currentRoom.value) return
  messagesLoading.value = true
  try {
    const result = await fetchMessages(currentRoom.value.chatroomId, { page: 1, size: 50 }, getAccessToken())
    messages.value = result?.data?.list || []
    await nextTick()
    scrollToBottom()
  } catch {
    messages.value = []
  } finally {
    messagesLoading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!currentRoom.value || pollingLock.value) return
    pollingLock.value = true
    try {
      const result = await fetchMessages(currentRoom.value.chatroomId, { page: 1, size: 50 }, getAccessToken())
      const newMsgs = result?.data?.list || []
      if (newMsgs.length !== messages.value.length) {
        messages.value = newMsgs
        await nextTick()
        scrollToBottom()
      }
    } catch {
    } finally {
      pollingLock.value = false
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function handleRecall(msg) {
  try {
    await ElMessageBox.confirm('确定要撤回该消息吗？', '撤回确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await recallMessage(currentRoom.value.chatroomId, msg.messageId, getAccessToken())
    msg.isRecalled = true
    ElMessage.success('消息已撤回')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '撤回失败')
    }
  }
}

async function handlePin(msg) {
  const newState = !msg.isPinned
  try {
    await pinMessage(currentRoom.value.chatroomId, msg.messageId, newState, getAccessToken())
    ElMessage.success(newState ? '已设为精华' : '已取消精华')
    msg.isPinned = newState
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function handleDelete(msg) {
  try {
    await ElMessageBox.confirm('确定要删除该消息吗？删除后不可恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteMessage(currentRoom.value.chatroomId, msg.messageId, getAccessToken())
    messages.value = messages.value.filter(m => m.messageId !== msg.messageId && m.id !== msg.messageId)
    ElMessage.success('消息已删除')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || !currentRoom.value) return
  if (mutedUntil.value && new Date(mutedUntil.value) > new Date()) {
    const until = new Date(mutedUntil.value)
    const time = `${String(until.getHours()).padStart(2, '0')}:${String(until.getMinutes()).padStart(2, '0')}`
    ElMessage.warning(`您已被禁言至 ${time}`)
    return
  }
  inputText.value = ''
  const optimisticMsg = {
    messageId: Date.now(),
    userId: currentUser.userId,
    username: currentUser.username,
    content: text,
    createdAt: new Date().toISOString(),
    isRecalled: false,
    isPinned: false,
  }
  messages.value = [...messages.value, optimisticMsg]
  await nextTick()
  scrollToBottom()
  try {
    await sendMessage(currentRoom.value.chatroomId, { content: text }, getAccessToken())
  } catch (e) {
    messages.value = messages.value.filter(m => m.messageId !== optimisticMsg.messageId)
    ElMessage.error(e.message || '发送失败')
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function scrollToBottom() {
  if (messageEndRef.value) {
    messageEndRef.value.scrollIntoView({ behavior: 'smooth' })
  }
}

function isSelfMessage(msg) {
  return currentUser && msg.userId === currentUser.userId
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function remoteMemberSearch(query) {
  if (!currentRoom.value || !query.trim()) {
    memberOptions.value = []
    return
  }
  memberSearchLoading.value = true
  try {
    const result = await fetchChatroomMembers(currentRoom.value.chatroomId, { keyword: query, page: 1, size: 20 }, getAccessToken())
    memberOptions.value = (result?.data?.list || [])
      .filter(m => m.userId !== currentUser.userId)
      .map(m => ({
        value: m.userId,
        label: `${m.username}${m.nickname ? ` (${m.nickname})` : ''}`,
      }))
  } catch {
    memberOptions.value = []
  } finally {
    memberSearchLoading.value = false
  }
}

function openTransferDialog() {
  targetUserId.value = ''
  memberOptions.value = []
  transferDialogVisible.value = true
}

async function handleTransferOwnership() {
  if (!targetUserId.value || !currentRoom.value) return
  transferLoading.value = true
  try {
    await transferOwnership(currentRoom.value.chatroomId, targetUserId.value, getAccessToken())
    ElMessage.success('群主转让成功')
    transferDialogVisible.value = false
    await loadMyRole()
    await loadMessages()
  } catch (e) {
    ElMessage.error(e.message || '转让失败')
  } finally {
    transferLoading.value = false
  }
}

function openMemberManagement() {
  kickOnlyMode.value = false
  loadManageMembers()
  memberManageVisible.value = true
}

function openKickMember() {
  kickOnlyMode.value = true
  loadManageMembers()
  memberManageVisible.value = true
}

async function loadManageMembers() {
  if (!currentRoom.value) return
  manageMembersLoading.value = true
  try {
    const result = await fetchChatroomMembers(currentRoom.value.chatroomId, { page: 1, size: 100 }, getAccessToken())
    const list = result?.data?.list || []
    manageMembers.value = kickOnlyMode.value
      ? list.filter(m => m.role === 'MEMBER')
      : list
  } catch {
    manageMembers.value = []
  } finally {
    manageMembersLoading.value = false
  }
}

async function handleManageKickMember(row) {
  try {
    await ElMessageBox.confirm(`确定要将 ${row.username} 踢出聊天室吗？`, '踢出确认', {
      type: 'warning', confirmButtonText: '踢出', cancelButtonText: '取消',
    })
    await removeChatroomMember(currentRoom.value.chatroomId, row.userId, getAccessToken())
    ElMessage.success(`已踢出 ${row.username}`)
    manageMembers.value = manageMembers.value.filter(m => m.userId !== row.userId)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '踢出失败')
  }
}

async function handleManageRoleChange(row) {
  try {
    await updateMemberRole(currentRoom.value.chatroomId, row.userId, { role: row.role }, getAccessToken())
    ElMessage.success('角色已更新')
  } catch (e) {
    ElMessage.error(e.message || '角色更新失败')
  }
}

const muteDurationOptions = [
  { value: 5, label: '5 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 360, label: '6 小时' },
  { value: 1440, label: '24 小时' },
  { value: 0, label: '永久' },
]

function openMuteDialog(row) {
  muteTargetMember.value = row
  muteDuration.value = 30
  muteDialogVisible.value = true
}

async function handleMuteMember() {
  if (!muteTargetMember.value || !currentRoom.value) return
  try {
    await muteMember(currentRoom.value.chatroomId, muteTargetMember.value.userId, muteDuration.value, getAccessToken())
    const label = muteDurationOptions.find(o => o.value === muteDuration.value)?.label || `${muteDuration.value} 分钟`
    ElMessage.success(`已将 ${muteTargetMember.value.username} 禁言 ${label}`)
    muteDialogVisible.value = false
    await loadManageMembers()
  } catch (e) {
    ElMessage.error(e.message || '禁言失败')
  }
}

async function handleUnmuteMember(row) {
  try {
    await unmuteMember(currentRoom.value.chatroomId, row.userId, getAccessToken())
    ElMessage.success(`已解除 ${row.username} 的禁言`)
    await loadManageMembers()
  } catch (e) {
    ElMessage.error(e.message || '解除禁言失败')
  }
}

function isMuted(row) {
  return row.mutedUntil && new Date(row.mutedUntil) > new Date()
}

function muteTimeLeft(row) {
  if (!row.mutedUntil) return null
  const diff = new Date(row.mutedUntil) - new Date()
  if (diff <= 0) return null
  const min = Math.ceil(diff / 60000)
  if (min >= 1440) return `${Math.floor(min / 1440)} 天`
  if (min >= 60) return `${Math.floor(min / 60)} 小时 ${min % 60} 分`
  return `${min} 分钟`
}
</script>

<template>
  <main class="chat-page">
    <!-- Mobile sidebar overlay -->
    <Transition name="slide">
      <aside v-if="showSidebar" class="room-sidebar">
        <div class="sidebar-header">
          <h3>聊天室</h3>
          <el-button link @click="loadRooms" :loading="loading" :icon="null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </el-button>
        </div>
        <div class="room-list" v-loading="loading">
          <div
            v-for="room in rooms"
            :key="room.chatroomId"
            :class="['room-item', { active: currentRoom?.chatroomId === room.chatroomId }]"
            @click="selectRoom(room)"
          >
            <div class="room-icon">
              {{ (room.name || '?')[0] }}
            </div>
            <div class="room-info">
              <div class="room-name">{{ room.name }}</div>
              <div class="room-meta">{{ room.memberCount || 0 }} 位成员</div>
            </div>
          </div>
          <div v-if="!loading && rooms.length === 0" class="empty-rooms">
            暂无聊天室
          </div>
        </div>
      </aside>
    </Transition>

    <main class="chat-main">
      <template v-if="currentRoom">
        <div class="chat-header">
          <button class="btn-back-mobile" @click="toggleSidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M9 6l-6 6 6 6"/>
            </svg>
          </button>
          <div class="header-info">
            <span class="header-name">{{ currentRoom.name }}</span>
            <span class="header-meta">{{ rooms.find(r => r.chatroomId === currentRoom.chatroomId)?.memberCount || 0 }} 人</span>
          </div>
          <el-dropdown v-if="currentUserRole === ROLE_OWNER || currentUserRole === ROLE_ADMIN" trigger="click" style="margin-right: 8px;">
            <el-button size="small">管理 ▾</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="currentUserRole === ROLE_OWNER" @click="openMemberManagement">成员管理</el-dropdown-item>
                <el-dropdown-item @click="openKickMember">踢出成员</el-dropdown-item>
                <el-dropdown-item v-if="currentUserRole === ROLE_OWNER" @click="openTransferDialog">转让群主</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <button class="btn-back" @click="goBack">返回列表</button>
        </div>

        <div class="messages-area" ref="messagesRef" v-loading="messagesLoading">
          <div
            v-for="msg in messages"
            :key="msg.messageId || msg.id"
            :class="['msg-row', isSelfMessage(msg) ? 'self' : 'other', { 'msg-pinned': msg.isPinned }]"
          >
            <div class="msg-avatar" v-if="!isSelfMessage(msg)">
              {{ (msg.username || '?')[0] }}
            </div>
            <div class="msg-spacer" v-else />
            <div class="msg-body">
              <div class="msg-user" v-if="!isSelfMessage(msg)">{{ msg.username }}</div>
              <div class="msg-bubble">
                <span v-if="msg.isRecalled" class="recalled-text">该消息已被撤回</span>
                <span v-else>{{ censorText(msg.content) }}</span>
                <span v-if="msg.isPinned && !msg.isRecalled" class="pin-badge" title="精华消息">⭐</span>
              </div>
              <div class="msg-actions" v-if="!msg.isRecalled && (canRecall(msg) || canPin() || canDelete())">
                <button v-if="canRecall(msg)" class="action-btn" @click="handleRecall(msg)">撤回</button>
                <button v-if="canDelete(msg)" class="action-btn danger" @click="handleDelete(msg)">删除</button>
                <button v-if="canPin()" class="action-btn" @click="handlePin(msg)">{{ msg.isPinned ? '取消精华' : '精华' }}</button>
              </div>
              <div class="msg-actions" v-else-if="msg.isRecalled && isManager()">
                <button class="action-btn danger" @click="handleDelete(msg)">删除</button>
              </div>
              <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
            </div>
            <div class="msg-avatar self-avatar" v-if="isSelfMessage(msg)">
              {{ (currentUser?.username || '你')[0] }}
            </div>
            <div class="msg-spacer" v-else />
          </div>
          <div ref="messageEndRef" />
        </div>

        <div class="input-area">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="2"
            placeholder="输入消息..."
            :disabled="!currentRoom"
            @keydown="handleKeydown"
            resize="none"
          />
          <el-button
            type="primary"
            :disabled="!inputText.trim()"
            @click="handleSend"
          >
            发送
          </el-button>
        </div>
      </template>

      <template v-else>
        <div class="no-room-selected">
          <div class="welcome-chat-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5d3ef0" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2>欢迎来到聊天室</h2>
          <p>请从左侧选择一个聊天室开始交流</p>
          <p class="hint">手机端点击左上角菜单按钮查看聊天室列表</p>
        </div>
      </template>
    </main>

    <el-dialog v-model="memberManageVisible" :title="kickOnlyMode ? '踢出成员' : '成员管理'" width="620px">
      <el-table :data="manageMembers" v-loading="manageMembersLoading" max-height="400" stripe border size="small">
        <el-table-column prop="username" label="用户名" min-width="100" />
        <el-table-column prop="nickname" label="昵称" min-width="100" />
        <el-table-column label="禁言状态" width="120">
          <template #default="scope">
            <el-tag v-if="isMuted(scope.row)" type="warning" size="small">🚫 {{ muteTimeLeft(scope.row) }}</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="!kickOnlyMode" label="角色" width="130">
          <template #default="scope">
            <template v-if="scope.row.role === 'OWNER'">
              <el-tag type="danger" size="small">群主</el-tag>
            </template>
            <el-select v-else v-model="scope.row.role" size="small" style="width: 100px" @change="handleManageRoleChange(scope.row)">
              <el-option label="管理员" value="ADMIN" />
              <el-option label="成员" value="MEMBER" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="scope">
            <template v-if="scope.row.role !== 'OWNER'">
              <el-button v-if="isMuted(scope.row)" link type="primary" size="small" @click="handleUnmuteMember(scope.row)">解禁</el-button>
              <el-button v-else link type="warning" size="small" @click="openMuteDialog(scope.row)">禁言</el-button>
              <el-button link type="danger" size="small" @click="handleManageKickMember(scope.row)">踢出</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="muteDialogVisible" title="禁言成员" width="400px">
      <p style="margin: 0 0 16px; color: #213547;">
        对 <strong>{{ muteTargetMember?.username }}</strong> 执行禁言
      </p>
      <el-form label-width="100px">
        <el-form-item label="禁言时长">
          <el-select v-model="muteDuration" style="width: 100%">
            <el-option v-for="opt in muteDurationOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="muteDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="handleMuteMember">确认禁言</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="transferDialogVisible" title="转让群主" width="420px">
      <el-form label-width="80px">
        <el-form-item label="新群主">
          <el-select
            v-model="targetUserId"
            filterable
            remote
            reserve-keyword
            :remote-method="remoteMemberSearch"
            :loading="memberSearchLoading"
            placeholder="搜索成员用户名"
            style="width: 100%"
          >
            <el-option v-for="item in memberOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="transferLoading" @click="handleTransferOwnership">确认转让</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.chat-page {
  display: flex;
  height: 100vh;
  background:
    linear-gradient(180deg, rgba(235, 240, 248, 0.96), rgba(242, 236, 226, 0.94)),
    radial-gradient(circle at top right, rgba(93, 62, 240, 0.12), transparent 30%),
    radial-gradient(circle at bottom left, rgba(47, 133, 90, 0.12), transparent 28%);
}

/* ---- Sidebar ---- */
.room-sidebar {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(56, 91, 102, 0.12);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.1);
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  color: #213547;
}

.room-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.room-item:hover {
  background: rgba(93, 62, 240, 0.08);
}

.room-item.active {
  background: rgba(93, 62, 240, 0.14);
}

.room-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5d3ef0, #7c5cfc);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.room-info {
  min-width: 0;
}

.room-name {
  font-weight: 600;
  color: #213547;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-meta {
  font-size: 12px;
  color: #6b7f87;
  margin-top: 2px;
}

.empty-rooms {
  text-align: center;
  padding: 40px 16px;
  color: #6b7f87;
}

/* ---- Chat Main ---- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.1);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
}

.header-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-name {
  font-weight: 700;
  font-size: 16px;
  color: #213547;
}

.header-meta {
  font-size: 12px;
  color: #6b7f87;
}

.btn-back {
  font-size: 13px;
  color: #5d3ef0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-back:hover {
  background: rgba(93, 62, 240, 0.08);
}

.btn-back-mobile {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #5d3ef0;
  border-radius: 6px;
}

.btn-back-mobile:hover {
  background: rgba(93, 62, 240, 0.08);
}

/* ---- Messages ---- */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-row {
  display: flex;
  gap: 8px;
  max-width: 80%;
}

.msg-row.self {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 34px;
  min-width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5d3ef0, #7c5cfc);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.msg-row.self .msg-avatar {
  background: linear-gradient(135deg, #2f855a, #48bb78);
}

.msg-spacer {
  width: 34px;
  min-width: 34px;
}

.msg-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.msg-user {
  font-size: 12px;
  color: #6b7f87;
  margin-bottom: 2px;
}

.msg-bubble {
  padding: 8px 14px;
  border-radius: 16px;
  background: #fff;
  color: #213547;
  line-height: 1.5;
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.msg-row.self .msg-bubble {
  background: linear-gradient(135deg, #5d3ef0, #7c5cfc);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg-row:not(.self) .msg-bubble {
  border-bottom-left-radius: 4px;
}

.msg-time {
  font-size: 11px;
  color: #9aaeb5;
  padding: 0 4px;
}

.msg-row.self .msg-time {
  text-align: right;
}

/* ---- Recalled / Pinned / Actions ---- */
.recalled-text {
  font-style: italic;
  color: #9aaeb5;
}

.pin-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 14px;
  line-height: 1;
}

.msg-bubble {
  position: relative;
}

.msg-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.msg-row:hover .msg-actions {
  opacity: 1;
}

.msg-row.self .msg-actions {
  justify-content: flex-end;
}

.action-btn {
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid rgba(56, 91, 102, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #5d3ef0;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: #5d3ef0;
  color: #fff;
  border-color: #5d3ef0;
}

.action-btn.danger {
  color: #e74c3c;
}

.action-btn.danger:hover {
  background: #e74c3c;
  color: #fff;
  border-color: #e74c3c;
}

.msg-pinned .msg-bubble {
  border-left: 3px solid #f1c40f;
}

/* ---- Input ---- */
.input-area {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  padding: 12px 18px;
  border-top: 1px solid rgba(56, 91, 102, 0.1);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
}

.input-area .el-button {
  flex-shrink: 0;
  margin-bottom: 8px;
}

/* ---- No room selected ---- */
.no-room-selected {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 24px;
}

.no-room-selected h2 {
  margin: 0;
  color: #213547;
  font-size: 22px;
}

.no-room-selected p {
  margin: 0;
  color: #6b7f87;
}

.no-room-selected .hint {
  font-size: 13px;
  color: #9aaeb5;
  margin-top: 4px;
}

.welcome-chat-icon {
  margin-bottom: 8px;
}

/* ---- Transitions ---- */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .room-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    width: 280px;
    height: 100vh;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.12);
  }

  .btn-back-mobile {
    display: block;
  }

  .msg-row {
    max-width: 90%;
  }
}
</style>
