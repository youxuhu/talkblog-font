<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchChatrooms,
  fetchChatroomById,
  createChatroom,
  updateChatroom,
  deleteChatroom,
  fetchChatroomMembers,
  addChatroomMember,
  removeChatroomMember,
  updateMemberRole,
  fetchChatroomStats,
  fetchChatroomDailyStats,
  batchDeleteChatrooms,
  batchRemoveChatroomMembers,
  batchUpdateChatroomMemberRoles,
} from '@/services/chatroom'
import { getAccessToken, fetchAdminUsers, getCurrentUser } from '@/services/auth'

const loading = ref(false)
const statsLoading = ref(false)
const savingId = ref(null)
const currentView = ref('list')
const selectedChatroom = ref(null)
const tableData = ref([])
const memberTableData = ref([])
const total = ref(0)
const memberTotal = ref(0)
const memberLoading = ref(false)
const allRoomsCache = ref(null)
const selectedRoomIds = ref([])
const selectedMemberIds = ref([])
const batchRoleDialogVisible = ref(false)
const batchRoleValue = ref('MEMBER')

const stats = ref({
  totalChatrooms: 0,
  totalMembers: 0,
  totalMessages: 0,
  activeChatrooms: 0,
  todayMessages: 0,
  avgMembersPerChatroom: 0,
})

const query = reactive({
  page: 1,
  size: 10,
  keyword: '',
})

const memberQuery = reactive({
  page: 1,
  size: 50,
  keyword: '',
})

const dialogVisible = ref(false)
const dialogTitle = ref('创建聊天室')
const dialogMode = ref('create')
const dialogForm = reactive({
  chatroomId: null,
  name: '',
  description: '',
  maxMembers: 100,
  isPrivate: false,
})

const addMemberVisible = ref(false)
const addMemberForm = reactive({
  userId: '',
  role: 'MEMBER',
})

const roleOptions = [
  { value: 'OWNER', label: '群主' },
  { value: 'ADMIN', label: '管理员' },
  { value: 'MEMBER', label: '成员' },
]

const userSearchLoading = ref(false)
const userOptions = ref([])

const dailyStatsLoading = ref(false)
const dailyStats = ref([])

const statusType = computed(() => (status) => {
  if (status === 'ACTIVE') return 'success'
  if (status === 'INACTIVE') return 'info'
  if (status === 'BANNED') return 'danger'
  return 'warning'
})

const statusLabel = computed(() => (status) => {
  const map = { ACTIVE: '正常', INACTIVE: '停用', BANNED: '封禁' }
  return map[status] || status
})

onMounted(() => {
  loadChatrooms()
  loadStats()
})

async function loadStats() {
  statsLoading.value = true
  try {
    const result = await fetchChatroomStats(getAccessToken())
    if (result?.data) {
      stats.value = result.data
    } else {
      await computeStatsFromRooms()
    }
  } catch (error) {
    console.error('统计接口不可用，尝试从房间数据计算', error)
    await computeStatsFromRooms()
  } finally {
    statsLoading.value = false
  }
}

async function loadChatrooms() {
  loading.value = true
  try {
    const result = await fetchChatrooms(query, getAccessToken())
    tableData.value = result?.data?.list || []
    total.value = result?.data?.total || 0
    if (result?.data?.list && total.value <= query.size) {
      allRoomsCache.value = result.data.list
    }
  } catch (error) {
    ElMessage.error(error?.message || '加载聊天室列表失败')
  } finally {
    loading.value = false
  }
}

async function computeStatsFromRooms() {
  try {
    if (!allRoomsCache.value) {
      const result = await fetchChatrooms({ page: 1, size: 10000, keyword: '' }, getAccessToken())
      allRoomsCache.value = result?.data?.list || []
    }
    const list = allRoomsCache.value
    const totalMembers = list.reduce((s, r) => s + (Number(r.memberCount) || 0), 0)
    const totalMessages = list.reduce((s, r) => s + (Number(r.messageCount) || 0), 0)
    stats.value = {
      totalChatrooms: list.length,
      totalMembers,
      totalMessages,
      activeChatrooms: list.filter(r => r.status === 'ACTIVE').length,
      todayMessages: 0,
      avgMembersPerChatroom: list.length > 0 ? Math.round(totalMembers / list.length) : 0,
    }
  } catch {
    // keep default stats (all zeros)
  }
}

async function loadChatroomMembers(chatroomId) {
  memberLoading.value = true
  try {
    const result = await fetchChatroomMembers(chatroomId, memberQuery, getAccessToken())
    memberTableData.value = result?.data?.list || []
    memberTotal.value = result?.data?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '加载成员列表失败')
  } finally {
    memberLoading.value = false
  }
}

async function remoteUserSearch(query) {
  if (!query.trim()) {
    userOptions.value = []
    return
  }
  userSearchLoading.value = true
  try {
    const result = await fetchAdminUsers({ keyword: query, page: 1, size: 20 }, getAccessToken())
    userOptions.value = (result?.data?.list || []).map(u => ({
      value: u.userId,
      label: `${u.username}${u.email ? ` (${u.email})` : ''}`,
    }))
  } catch {
    userOptions.value = []
  } finally {
    userSearchLoading.value = false
  }
}

async function loadDailyStats(chatroomId) {
  dailyStatsLoading.value = true
  try {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    const fmt = d => d.toISOString().slice(0, 10)
    const result = await fetchChatroomDailyStats(chatroomId, {
      startDate: fmt(start),
      endDate: fmt(end),
    }, getAccessToken())
    dailyStats.value = result?.data?.dailyStats || []
  } catch {
    dailyStats.value = []
  } finally {
    dailyStatsLoading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadChatrooms()
}

function handlePageChange(page) {
  query.page = page
  loadChatrooms()
}

function handleSizeChange(size) {
  query.size = size
  query.page = 1
  loadChatrooms()
}

function openCreateDialog() {
  dialogMode.value = 'create'
  dialogTitle.value = '创建聊天室'
  dialogForm.chatroomId = null
  dialogForm.name = ''
  dialogForm.description = ''
  dialogForm.maxMembers = 100
  dialogForm.isPrivate = false
  dialogVisible.value = true
}

async function openEditDialog(row) {
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑聊天室'
  try {
    const result = await fetchChatroomById(row.chatroomId, getAccessToken())
    const data = result?.data || row
    dialogForm.chatroomId = data.chatroomId
    dialogForm.name = data.name || ''
    dialogForm.description = data.description || ''
    dialogForm.maxMembers = data.maxMembers || 100
    dialogForm.isPrivate = data.isPrivate || false
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error('加载聊天室信息失败')
  }
}

async function handleDialogSubmit() {
  if (!dialogForm.name.trim()) {
    ElMessage.warning('请输入聊天室名称')
    return
  }

  savingId.value = 'submit'
  try {
    const payload = {
      name: dialogForm.name.trim(),
      description: dialogForm.description.trim(),
      maxMembers: dialogForm.maxMembers,
      isPrivate: dialogForm.isPrivate,
    }

    if (dialogMode.value === 'create') {
      const result = await createChatroom(payload, getAccessToken())
      const newRoomId = result?.data?.chatroomId
      if (newRoomId) {
        const currentUserId = getCurrentUser()?.userId
        if (currentUserId) {
          await addChatroomMember(newRoomId, { userId: currentUserId, role: 'OWNER' }, getAccessToken())
        }
      }
      allRoomsCache.value = null
      ElMessage.success('创建成功')
    } else {
      await updateChatroom(dialogForm.chatroomId, payload, getAccessToken())
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    await loadChatrooms()
    await loadStats()
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    savingId.value = null
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除聊天室「${row.name}」吗？`, '删除确认', {
      type: 'warning',
    })
    savingId.value = row.chatroomId
    await deleteChatroom(row.chatroomId, getAccessToken())
    allRoomsCache.value = null
    ElMessage.success('删除成功')
    await loadChatrooms()
    await loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  } finally {
    savingId.value = null
  }
}

function goToMembers(row) {
  selectedChatroom.value = row
  memberQuery.page = 1
  memberQuery.keyword = ''
  loadChatroomMembers(row.chatroomId)
  loadDailyStats(row.chatroomId)
  currentView.value = 'members'
}

function goBackToList() {
  currentView.value = 'list'
  selectedChatroom.value = null
}

function openAddMemberDialog() {
  addMemberForm.userId = ''
  addMemberForm.role = 'MEMBER'
  addMemberVisible.value = true
}

async function handleAddMember() {
  if (!addMemberForm.userId) {
    ElMessage.warning('请搜索并选择用户')
    return
  }

  savingId.value = 'add-member'
  try {
    await addChatroomMember(selectedChatroom.value.chatroomId, {
      userId: addMemberForm.userId,
      role: addMemberForm.role,
    }, getAccessToken())
    ElMessage.success('添加成员成功')
    addMemberVisible.value = false
    await loadChatroomMembers(selectedChatroom.value.chatroomId)
    await loadStats()
  } catch (error) {
    ElMessage.error(error?.message || '添加失败')
  } finally {
    savingId.value = null
  }
}

async function handleRemoveMember(row) {
  if (row.role === 'OWNER') {
    ElMessage.warning('群主不可被移除')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要将用户 ${row.userId} 从聊天室移除吗？`, '移除确认', {
      type: 'warning',
    })
    savingId.value = row.userId
    await removeChatroomMember(selectedChatroom.value.chatroomId, row.userId, getAccessToken())
    ElMessage.success('移除成功')
    await loadChatroomMembers(selectedChatroom.value.chatroomId)
    await loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '移除失败')
    }
  } finally {
    savingId.value = null
  }
}

async function handleUpdateMemberRole(row) {
  if (row.role === 'OWNER') {
    ElMessage.warning('群主身份不可在后台修改')
    await loadChatroomMembers(selectedChatroom.value.chatroomId)
    return
  }
  savingId.value = row.userId
  try {
    await updateMemberRole(selectedChatroom.value.chatroomId, row.userId, {
      role: row.role,
    }, getAccessToken())
    ElMessage.success('更新角色成功')
    await loadChatroomMembers(selectedChatroom.value.chatroomId)
  } catch (error) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    savingId.value = null
  }
}

function memberRoleType(role) {
  if (role === 'OWNER') return 'danger'
  if (role === 'ADMIN') return 'warning'
  return 'success'
}

function handleRoomSelectionChange(selection) {
  selectedRoomIds.value = selection.map(row => row.chatroomId)
}

function handleMemberSelectionChange(selection) {
  selectedMemberIds.value = selection.map(row => row.userId)
}

async function handleBatchDeleteRooms() {
  if (selectedRoomIds.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要批量删除选中的 ${selectedRoomIds.value.length} 个聊天室吗？此操作不可撤销。`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    savingId.value = 'batch'
    const results = await Promise.allSettled(
      selectedRoomIds.value.map(id => deleteChatroom(id, getAccessToken()))
    )
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.filter(r => r.status === 'rejected').length
    ElMessage.success(`批量删除完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`)
    allRoomsCache.value = null
    selectedRoomIds.value = []
    await loadChatrooms()
    await loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '批量删除失败')
    }
  } finally {
    savingId.value = null
  }
}

async function handleBatchRemoveMembers() {
  if (selectedMemberIds.value.length === 0) return
  const ownerIds = memberTableData.value
    .filter(m => m.role === 'OWNER' && selectedMemberIds.value.includes(m.userId))
    .map(m => m.userId)
  if (ownerIds.length > 0) {
    ElMessage.warning(`已自动跳过 ${ownerIds.length} 名群主，无法移除`)
  }
  const targetIds = selectedMemberIds.value.filter(id => !ownerIds.includes(id))
  if (targetIds.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要批量移除选中的 ${targetIds.length} 个成员吗？`,
      '批量移除确认',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' }
    )
    savingId.value = 'batch'
    const results = await Promise.allSettled(
      targetIds.map(userId =>
        removeChatroomMember(selectedChatroom.value.chatroomId, userId, getAccessToken())
      )
    )
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.filter(r => r.status === 'rejected').length
    ElMessage.success(`批量移除完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`)
    selectedMemberIds.value = []
    await loadChatroomMembers(selectedChatroom.value.chatroomId)
    await loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '批量移除失败')
    }
  } finally {
    savingId.value = null
  }
}

function openBatchRoleDialog() {
  if (selectedMemberIds.value.length === 0) return
  const ownerIds = memberTableData.value
    .filter(m => m.role === 'OWNER' && selectedMemberIds.value.includes(m.userId))
    .map(m => m.userId)
  if (ownerIds.length > 0) {
    ElMessage.warning(`已自动跳过 ${ownerIds.length} 名群主，无法修改其角色`)
    selectedMemberIds.value = selectedMemberIds.value.filter(id => !ownerIds.includes(id))
  }
  if (selectedMemberIds.value.length === 0) return
  batchRoleValue.value = 'MEMBER'
  batchRoleDialogVisible.value = true
}

async function handleBatchUpdateRole() {
  savingId.value = 'batch'
  try {
    const results = await Promise.allSettled(
      selectedMemberIds.value.map(userId =>
        updateMemberRole(selectedChatroom.value.chatroomId, userId, { role: batchRoleValue.value }, getAccessToken())
      )
    )
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failCount = results.filter(r => r.status === 'rejected').length
    ElMessage.success(`批量修改角色完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`)
    batchRoleDialogVisible.value = false
    selectedMemberIds.value = []
    await loadChatroomMembers(selectedChatroom.value.chatroomId)
  } catch (error) {
    ElMessage.error(error?.message || '批量修改角色失败')
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <main class="chatroom-page">
    <template v-if="currentView === 'list'">
      <section class="page-header">
        <div>
          <p class="eyebrow">Admin Console</p>
          <h1 class="title">聊天室管理</h1>
          <p class="subtitle">管理聊天室成员，统计聊天室数据</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <el-button
            v-if="selectedRoomIds.length > 0"
            type="danger"
            :loading="savingId === 'batch'"
            @click="handleBatchDeleteRooms"
          >
            批量删除 ({{ selectedRoomIds.length }})
          </el-button>
          <el-button type="primary" @click="openCreateDialog">创建聊天室</el-button>
        </div>
      </section>

      <section class="stats-grid">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ stats.totalChatrooms }}</div>
          <div class="stat-label">聊天室总数</div>
        </el-card>
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ stats.totalMembers }}</div>
          <div class="stat-label">成员总数</div>
        </el-card>
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ stats.totalMessages }}</div>
          <div class="stat-label">消息总数</div>
        </el-card>
        <el-card shadow="never" class="stat-card">
          <div class="stat-value">{{ stats.activeChatrooms }}</div>
          <div class="stat-label">活跃聊天室</div>
        </el-card>
      </section>

      <section class="search-bar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索聊天室名称"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="loadChatrooms">刷新</el-button>
      </section>

      <el-card shadow="never" class="table-card">
        <el-table :data="tableData" v-loading="loading" stripe border @selection-change="handleRoomSelectionChange">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="chatroomId" label="ID" width="80" />
          <el-table-column prop="name" label="聊天室名称" min-width="160" />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="memberCount" label="成员数" width="100" align="center" />
          <el-table-column prop="messageCount" label="消息数" width="100" align="center" />
          <el-table-column prop="maxMembers" label="上限人数" width="100" align="center" />
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="160" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="goToMembers(scope.row)">成员</el-button>
              <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button
                link
                type="danger"
                :loading="savingId === scope.row.chatroomId"
                @click="handleDelete(scope.row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager-row">
          <span class="pager-summary">共 {{ total }} 条</span>
          <el-pagination
            :current-page="query.page"
            :page-size="query.size"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="sizes, prev, pager, next, jumper"
            background
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </el-card>
    </template>

    <template v-else>
      <section class="page-header">
        <div>
          <el-button link @click="goBackToList">返回列表</el-button>
          <h1 class="title">成员管理 - {{ selectedChatroom?.name }}</h1>
          <p class="subtitle">聊天室ID: {{ selectedChatroom?.chatroomId }}</p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <el-button
            v-if="selectedMemberIds.length > 0"
            type="danger"
            :loading="savingId === 'batch'"
            @click="handleBatchRemoveMembers"
          >
            批量移除 ({{ selectedMemberIds.length }})
          </el-button>
          <el-button
            v-if="selectedMemberIds.length > 0"
            type="warning"
            :loading="savingId === 'batch'"
            @click="openBatchRoleDialog"
          >
            批量改角色
          </el-button>
          <el-button type="primary" @click="openAddMemberDialog">添加成员</el-button>
        </div>
      </section>

      <section class="search-bar">
        <el-input
          v-model="memberQuery.keyword"
          placeholder="搜索成员用户名/昵称"
          clearable
          @keyup.enter="loadChatroomMembers(selectedChatroom.chatroomId)"
        />
        <el-button type="primary" @click="loadChatroomMembers(selectedChatroom.chatroomId)">搜索</el-button>
        <el-button @click="() => { memberQuery.keyword = ''; memberQuery.page = 1; loadChatroomMembers(selectedChatroom.chatroomId) }">刷新</el-button>
      </section>

      <el-card shadow="never" class="table-card">
        <el-table :data="memberTableData" v-loading="memberLoading" stripe border @selection-change="handleMemberSelectionChange">
          <el-table-column type="selection" width="50" />
          <el-table-column prop="userId" label="用户ID" width="100" />
          <el-table-column prop="username" label="用户名" min-width="120" />
          <el-table-column prop="nickname" label="昵称" min-width="120" />
          <el-table-column label="角色" width="140">
            <template #default="scope">
              <template v-if="scope.row.role === 'OWNER'">
                <el-tag type="danger" size="small">群主（不可修改）</el-tag>
              </template>
              <el-select
                v-else
                v-model="scope.row.role"
                size="small"
                style="width: 100px"
                @change="handleUpdateMemberRole(scope.row)"
                :disabled="savingId === scope.row.userId"
              >
                <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="角色标签" width="120">
            <template #default="scope">
              <el-tag :type="memberRoleType(scope.row.role)">{{ scope.row.role }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="joinedAt" label="加入时间" min-width="160" />
          <el-table-column prop="lastActiveTime" label="最后活跃" min-width="160" />
          <el-table-column prop="messageCount" label="发言数" width="100" align="center" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="scope">
              <el-button
                v-if="scope.row.role !== 'OWNER'"
                link
                type="danger"
                :loading="savingId === scope.row.userId"
                @click="handleRemoveMember(scope.row)"
              >
                移除
              </el-button>
              <span v-else style="color: #9aaeb5; font-size: 12px;">不可移除</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager-row">
          <span class="pager-summary">共 {{ memberTotal }} 条</span>
          <el-pagination
            :current-page="memberQuery.page"
            :page-size="memberQuery.size"
            :page-sizes="[20, 50, 100]"
            :total="memberTotal"
            layout="sizes, prev, pager, next, jumper"
            background
            @current-change="(p) => { memberQuery.page = p; loadChatroomMembers(selectedChatroom.chatroomId) }"
            @size-change="(s) => { memberQuery.size = s; memberQuery.page = 1; loadChatroomMembers(selectedChatroom.chatroomId) }"
          />
        </div>
      </el-card>

      <section class="daily-stats-section" v-loading="dailyStatsLoading">
        <h3 class="stats-title">近7日活跃统计</h3>
        <el-table :data="dailyStats" stripe border empty-text="暂无统计数据" size="small">
          <el-table-column prop="date" label="日期" width="140" />
          <el-table-column prop="messageCount" label="消息数" width="120" align="center" />
          <el-table-column prop="activeMembers" label="活跃成员" width="120" align="center" />
          <el-table-column prop="newMembers" label="新增成员" width="120" align="center" />
        </el-table>
      </section>
    </template>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="dialogForm" label-width="100px">
        <el-form-item label="聊天室名称">
          <el-input v-model="dialogForm.name" placeholder="输入聊天室名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="dialogForm.description" type="textarea" :rows="3" placeholder="输入聊天室描述" />
        </el-form-item>
        <el-form-item label="最大人数">
          <el-input-number v-model="dialogForm.maxMembers" :min="2" :max="1000" />
        </el-form-item>
        <el-form-item label="私密聊天室">
          <el-switch v-model="dialogForm.isPrivate" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingId === 'submit'" @click="handleDialogSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="addMemberVisible" title="添加成员" width="450px">
      <el-form :model="addMemberForm" label-width="80px">
        <el-form-item label="搜索用户">
          <el-select
            v-model="addMemberForm.userId"
            filterable
            remote
            reserve-keyword
            :remote-method="remoteUserSearch"
            :loading="userSearchLoading"
            placeholder="输入用户名或邮箱搜索"
            style="width: 100%"
          >
            <el-option
              v-for="item in userOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="addMemberForm.role" style="width: 100%">
            <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addMemberVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingId === 'add-member'" @click="handleAddMember">
          添加
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchRoleDialogVisible" title="批量修改角色" width="400px">
      <el-form label-width="80px">
        <el-form-item label="目标角色">
          <el-select v-model="batchRoleValue" style="width: 100%">
            <el-option v-for="opt in roleOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <p style="color: #6b7f87; font-size: 13px; margin: 0;">
          将影响已选中的 {{ selectedMemberIds.length }} 名成员
        </p>
      </el-form>
      <template #footer>
        <el-button @click="batchRoleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingId === 'batch'" @click="handleBatchUpdateRole">
          确定
        </el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.chatroom-page {
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(235, 240, 248, 0.96), rgba(242, 236, 226, 0.94)),
    radial-gradient(circle at top right, rgba(93, 62, 240, 0.12), transparent 30%),
    radial-gradient(circle at bottom left, rgba(47, 133, 90, 0.12), transparent 28%);
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5d3ef0;
  font-size: 12px;
  font-weight: 800;
}

.title {
  margin: 0;
  color: #213547;
  font-size: clamp(1.8rem, 4vw, 3rem);
}

.subtitle {
  margin: 10px 0 0;
  color: #385b66;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #213547;
}

.stat-label {
  margin-top: 8px;
  color: #6b7f87;
  font-size: 14px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  max-width: 600px;
}

.table-card {
  border-radius: 18px;
}

.pager-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.pager-summary {
  color: #6b7f87;
}

.daily-stats-section {
  margin-top: 24px;
}

.stats-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #213547;
}

@media (max-width: 768px) {
  .chatroom-page {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .search-bar {
    width: 100%;
    max-width: none;
  }
}
</style>