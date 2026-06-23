<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAccessToken, getCurrentUser } from '@/services/auth'
import * as commentService from '@/services/comment'

const router = useRouter()
const loading = ref(false)
const batchLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedIds = ref([])

const swLoading = ref(false)
const swTableData = ref([])
const swDialogVisible = ref(false)
const swSaving = ref(false)
const swForm = reactive({ word: '', replacement: '***' })

const query = reactive({
  page: 1,
  size: 10,
  keyword: '',
  status: '',
  blogId: '',
})

const currentUser = computed(() => getCurrentUser())

onMounted(() => {
  loadComments()
})

async function loadComments() {
  loading.value = true
  try {
    const result = await commentService.fetchAdminComments({
      page: query.page,
      size: query.size,
      keyword: query.keyword || undefined,
      status: query.status !== '' ? Number(query.status) : undefined,
      blogId: query.blogId || undefined,
    })
    tableData.value = result?.data?.list || []
    total.value = result?.data?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '加载评论失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadComments()
}

function handleReset() {
  query.page = 1
  query.keyword = ''
  query.status = ''
  query.blogId = ''
  loadComments()
}

function handlePageChange(page) {
  query.page = page
  loadComments()
}

function handleSizeChange(size) {
  query.size = size
  query.page = 1
  loadComments()
}

function statusLabel(status) {
  const map = { 0: '待审核', 1: '已通过', 2: '已拒绝' }
  return map[status] || '未知'
}

function statusType(status) {
  const map = { 0: 'warning', 1: 'success', 2: 'danger' }
  return map[status] || 'info'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function handleReview(row, status) {
  try {
    await commentService.reviewComment(row.commentId, status)
    ElMessage.success(status === 1 ? '评论已通过' : '评论已拒绝')
    await loadComments()
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定删除该评论？删除后无法恢复。', '确认删除', {
      type: 'warning',
    })
    await commentService.adminDeleteComment(row.commentId)
    ElMessage.success('评论已删除')
    await loadComments()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

function handleSelectionChange(selection) {
  selectedIds.value = selection.map((item) => item.commentId)
}

async function handleBatchReview(status) {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择评论')
    return
  }

  batchLoading.value = true
  try {
    await commentService.batchReviewComments(selectedIds.value, status)
    ElMessage.success(`已${status === 1 ? '通过' : '拒绝'} ${selectedIds.value.length} 条评论`)
    selectedIds.value = []
    await loadComments()
  } catch (error) {
    ElMessage.error(error?.message || '批量操作失败')
  } finally {
    batchLoading.value = false
  }
}

async function handleBatchDelete() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请先选择评论')
    return
  }

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条评论？`, '确认删除', {
      type: 'warning',
    })

    batchLoading.value = true
    for (const id of selectedIds.value) {
      await commentService.adminDeleteComment(id)
    }
    ElMessage.success(`已删除 ${selectedIds.value.length} 条评论`)
    selectedIds.value = []
    await loadComments()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '批量删除失败')
    }
  } finally {
    batchLoading.value = false
  }
}

function goBack() {
  router.push('/welcome')
}

function goToStats() {
  router.push('/admin/comments/stats')
}

function goToReports() {
  router.push('/admin/comments/reports')
}

async function handleTogglePin(row) {
  try {
    const result = await commentService.togglePin(row.commentId)
    const pinned = result?.data?.isPinned
    row.isPinned = pinned
    ElMessage.success(pinned ? '已置顶' : '已取消置顶')
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  }
}

function swBuildUrl(path) {
  const base = import.meta.env.VITE_API_BASE_URL || ''
  return `${base}${path}`
}

async function swRequest(path, options = {}) {
  const { method = 'GET', payload } = options
  const response = await fetch(swBuildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  let data = null
  try { data = await response.json() } catch { data = null }
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || '请求失败')
  }
  return data
}

async function swLoad() {
  swLoading.value = true
  try {
    const result = await swRequest('/api/admin/sensitive-words')
    swTableData.value = result?.data || []
  } catch (error) {
    ElMessage.error(error?.message || '加载敏感词失败')
  } finally {
    swLoading.value = false
  }
}

function swOpenDialog() {
  swForm.word = ''
  swForm.replacement = '***'
  swDialogVisible.value = true
}

async function swAdd() {
  if (!swForm.word.trim()) {
    ElMessage.warning('请输入敏感词')
    return
  }
  swSaving.value = true
  try {
    await swRequest('/api/admin/sensitive-words', {
      method: 'POST',
      payload: { word: swForm.word.trim(), replacement: swForm.replacement.trim() || '***' },
    })
    ElMessage.success('添加成功')
    swDialogVisible.value = false
    await swLoad()
  } catch (error) {
    ElMessage.error(error?.message || '添加失败')
  } finally {
    swSaving.value = false
  }
}

async function swDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除敏感词「${row.word}」？`, '确认删除', { type: 'warning' })
    await swRequest(`/api/admin/sensitive-words/${row.id}`, { method: 'DELETE' })
    ElMessage.success('已删除')
    await swLoad()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}
</script>

<template>
  <main class="admin-comments-page">
    <section class="admin-hero">
      <div>
        <px-button plain size="small" :use-throttle="false" @click="goBack">
          返回
        </px-button>
        <h1 class="title">评论管理</h1>
        <p class="subtitle">当前登录：{{ currentUser?.username || currentUser?.email || '未知' }}</p>
      </div>

      <div class="header-actions">
        <px-button plain :use-throttle="false" @click="goToStats">
          数据统计
        </px-button>
        <px-button plain :use-throttle="false" @click="goToReports">
          举报管理
        </px-button>
        <px-button plain :use-throttle="false" @click="swOpenDialog">
          敏感词库
        </px-button>
      </div>
    </section>

    <section class="filter-bar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索评论内容、用户名"
        clearable
        style="width: 220px"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="query.status" placeholder="评论状态" clearable style="width: 140px">
        <el-option label="待审核" :value="0" />
        <el-option label="已通过" :value="1" />
        <el-option label="已拒绝" :value="2" />
      </el-select>
      <el-input
        v-model="query.blogId"
        placeholder="按博客 ID 筛选"
        clearable
        style="width: 160px"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </section>

    <section class="batch-actions" v-if="selectedIds.length > 0">
      <span class="selected-count">已选 {{ selectedIds.length }} 条</span>
      <el-button
        type="success"
        size="small"
        :loading="batchLoading"
        @click="handleBatchReview(1)"
      >
        批量通过
      </el-button>
      <el-button
        type="warning"
        size="small"
        :loading="batchLoading"
        @click="handleBatchReview(2)"
      >
        批量拒绝
      </el-button>
      <el-button
        type="danger"
        size="small"
        :loading="batchLoading"
        @click="handleBatchDelete"
      >
        批量删除
      </el-button>
    </section>

    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="commentId" label="ID" width="80" />
        <el-table-column label="博客" min-width="140">
          <template #default="scope">
            <span>{{ scope.row.blogTitle || `Blog #${scope.row.blogId}` }}</span>
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="scope">
            <div>
              <div class="user-cell">{{ scope.row.username }}</div>
              <div class="user-email">{{ scope.row.email }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="置顶" width="70" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.isPinned" type="warning" size="small">置顶</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="编辑" width="60" align="center">
          <template #default="scope">
            <span v-if="scope.row.editCount > 0" class="edited-text">{{ scope.row.editCount }} 次</span>
          </template>
        </el-table-column>
        <el-table-column label="评论内容" min-width="220">
          <template #default="scope">
            <el-tooltip :content="scope.row.content" placement="top" :show-after="300">
              <span class="content-cell">{{ scope.row.content }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="点赞" width="80" align="center">
          <template #default="scope">
            {{ scope.row.likeCount || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="IP" width="130">
          <template #default="scope">
            {{ scope.row.ipAddress || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)" size="small">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <template v-if="scope.row.status === 0">
              <el-button
                link
                type="success"
                size="small"
                @click="handleReview(scope.row, 1)"
              >
                通过
              </el-button>
              <el-button
                link
                type="warning"
                size="small"
                @click="handleReview(scope.row, 2)"
              >
                拒绝
              </el-button>
            </template>
            <el-button
              link
              :type="scope.row.isPinned ? 'warning' : 'default'"
              size="small"
              @click="handleTogglePin(scope.row)"
            >
              {{ scope.row.isPinned ? '取消置顶' : '置顶' }}
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
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

    <el-dialog v-model="swDialogVisible" title="敏感词库" width="520px" @open="swLoad">
      <el-table :data="swTableData" v-loading="swLoading" stripe border max-height="300">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="word" label="敏感词" min-width="180" />
        <el-table-column prop="replacement" label="替换为" width="100" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="scope">
            <el-button link type="danger" size="small" @click="swDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider />

      <el-form label-position="top">
        <el-form-item label="敏感词" required>
          <el-input v-model="swForm.word" placeholder="请输入敏感词" />
        </el-form-item>
        <el-form-item label="替换为">
          <el-input v-model="swForm.replacement" placeholder="默认 ***" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="swDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="swSaving" @click="swAdd">添加</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.admin-comments-page {
  min-height: 100vh;
  padding: 24px;
  background: var(--bg-admin);
}

.admin-hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.title {
  margin: 8px 0 6px;
  color: var(--color-text-primary);
  font-size: clamp(1.8rem, 4vw, 3rem);
}

.subtitle {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--color-accent-bg);
  border-radius: 12px;
  border: 1px solid var(--color-accent);
}

.selected-count {
  color: var(--color-accent);
  font-weight: 600;
  font-size: 14px;
  margin-right: 8px;
}

.table-card {
  border-radius: 18px;
}

.user-cell {
  font-weight: 600;
  color: var(--color-text-primary);
}

.user-email {
  color: var(--color-text-light);
  font-size: 12px;
}

.content-cell {
  display: inline-block;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-secondary);
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
  color: var(--color-text-muted);
}

.edited-text {
  color: var(--color-text-muted);
  font-size: 12px;
}

@media (max-width: 768px) {
  .admin-comments-page {
    padding: 16px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-bar > * {
    width: 100% !important;
  }

  .pager-row {
    justify-content: center;
  }
}
</style>
