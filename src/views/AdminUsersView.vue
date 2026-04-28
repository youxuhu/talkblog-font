<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchAdminUsers, getAccessToken, getCurrentUser, updateUserStatus } from '@/services/auth'

const loading = ref(false)
const savingId = ref(null)
const tableData = ref([])
const total = ref(0)

const query = reactive({
  page: 1,
  size: 10,
  keyword: '',
})

const currentUser = computed(() => getCurrentUser())

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const result = await fetchAdminUsers(query, getAccessToken())
    tableData.value = result?.data?.list || []
    total.value = result?.data?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadUsers()
}

function handlePageChange(page) {
  query.page = page
  loadUsers()
}

function handleSizeChange(size) {
  query.size = size
  query.page = 1
  loadUsers()
}

function normalizeRoles(row) {
  if (Array.isArray(row.roles) && row.roles.length > 0) {
    return row.roles
  }

  return []
}

function statusLabel(status) {
  if (status === 1) {
    return '正常'
  }

  if (status === 2) {
    return '冻结'
  }

  return '禁用'
}

function statusType(status) {
  if (status === 1) {
    return 'success'
  }

  if (status === 2) {
    return 'warning'
  }

  return 'danger'
}

async function handleToggleStatus(row) {
  const nextStatus = row.status === 1 ? 2 : 1
  savingId.value = row.userId

  try {
    const result = await updateUserStatus(row.userId, nextStatus, getAccessToken())
    ElMessage.success(result?.message || '状态已更新')
    await loadUsers()
  } catch (error) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <main class="admin-page">
    <section class="admin-hero">
      <div>
        <p class="eyebrow">Admin Console</p>
        <h1 class="title">用户管理</h1>
        <p class="subtitle">当前登录用户：{{ currentUser?.username || currentUser?.email || '未知' }}</p>
      </div>

      <div class="search-bar">
        <el-input
          v-model="query.keyword"
          placeholder="按用户名、邮箱或手机号搜索"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>
    </section>

    <el-card class="table-card" shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe border>
        <el-table-column prop="userId" label="ID" width="90" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column label="角色" min-width="160">
          <template #default="scope">
            <el-space wrap>
              <el-tag v-for="role in normalizeRoles(scope.row)" :key="role" type="info">{{ role }}</el-tag>
              <span v-if="normalizeRoles(scope.row).length === 0" class="muted">未分配</span>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="loginType" label="登录方式" width="120" />
        <el-table-column prop="lastLoginTime" label="最后登录" min-width="180" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="scope">
            <el-button
              link
              type="primary"
              :loading="savingId === scope.row.userId"
              @click="handleToggleStatus(scope.row)"
            >
              {{ scope.row.status === 1 ? '冻结' : '启用' }}
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
  </main>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(235, 240, 248, 0.96), rgba(242, 236, 226, 0.94)),
    radial-gradient(circle at top right, rgba(93, 62, 240, 0.12), transparent 30%),
    radial-gradient(circle at bottom left, rgba(47, 133, 90, 0.12), transparent 28%);
}

.admin-hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
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

.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: min(100%, 460px);
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

.pager-summary,
.muted {
  color: #6b7f87;
}

@media (max-width: 768px) {
  .admin-page {
    padding: 16px;
  }

  .search-bar {
    width: 100%;
    min-width: 0;
  }

  .pager-row {
    justify-content: center;
  }
}
</style>
