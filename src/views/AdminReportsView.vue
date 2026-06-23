<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCurrentUser } from '@/services/auth'
import { useCommentStore } from '@/stores/comment'

const router = useRouter()
const store = useCommentStore()
const loading = ref(false)
const selectedIds = ref([])
const tableData = computed(() => store.reports)
const total = computed(() => store.reportTotal)

const query = reactive({
  page: 1,
  size: 10,
  status: '',
})

const currentUser = computed(() => getCurrentUser())

const statusLabels = { 0: '待处理', 1: '已驳回', 2: '已处理' }
const statusTypes = { 0: 'warning', 1: 'info', 2: 'success' }

onMounted(() => {
  loadReports()
})

async function loadReports() {
  loading.value = true
  try {
    await store.fetchReports({
      page: query.page,
      size: query.size,
      status: query.status !== '' ? Number(query.status) : undefined,
    })
  } catch (error) {
    ElMessage.error(error?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadReports()
}

function handleReset() {
  query.page = 1
  query.status = ''
  loadReports()
}

function handlePageChange(page) {
  query.page = page
  loadReports()
}

function handleSizeChange(size) {
  query.size = size
  query.page = 1
  loadReports()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function handleResolve(row) {
  try {
    await ElMessageBox.confirm('确认后该评论将被删除。确定处理？', '确认处理', { type: 'warning' })
    await store.handleReport(row.id, 2)
    ElMessage.success('已处理')
    await loadReports()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '操作失败')
    }
  }
}

async function handleDismiss(row) {
  try {
    await store.handleReport(row.id, 1)
    ElMessage.success('已驳回')
    await loadReports()
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  }
}

function goBack() {
  router.push('/admin/comments')
}
</script>

<template>
  <main class="admin-reports-page">
    <section class="admin-hero">
      <div>
        <px-button plain size="small" :use-throttle="false" @click="goBack">
          返回评论管理
        </px-button>
        <h1 class="title">举报管理</h1>
        <p class="subtitle">当前登录：{{ currentUser?.username || currentUser?.email || '未知' }}</p>
      </div>
    </section>

    <section class="filter-bar">
      <el-select v-model="query.status" placeholder="处理状态" clearable style="width: 140px">
        <el-option label="待处理" :value="0" />
        <el-option label="已驳回" :value="1" />
        <el-option label="已处理" :value="2" />
      </el-select>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </section>

    <el-card class="table-card" shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="commentId" label="评论ID" width="80" />
        <el-table-column label="举报原因" width="120">
          <template #default="scope">
            <el-tag size="small">{{ scope.row.reason }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="补充描述" min-width="200">
          <template #default="scope">
            <span class="desc-cell">{{ scope.row.description || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="举报人" width="100">
          <template #default="scope">
            {{ scope.row.reporterId }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="statusTypes[scope.row.status] || 'info'" size="small">
              {{ statusLabels[scope.row.status] || '未知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <template v-if="scope.row.status === 0">
              <el-button link type="danger" size="small" @click="handleResolve(scope.row)">
                删除评论
              </el-button>
              <el-button link type="info" size="small" @click="handleDismiss(scope.row)">
                驳回
              </el-button>
            </template>
            <span v-else class="handled-text">已处理</span>
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
  </main>
</template>

<style scoped>
.admin-reports-page {
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

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.table-card {
  border-radius: 18px;
}

.desc-cell {
  display: inline-block;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-secondary);
}

.handled-text {
  color: var(--color-text-muted);
  font-size: 13px;
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

@media (max-width: 768px) {
  .admin-reports-page {
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
