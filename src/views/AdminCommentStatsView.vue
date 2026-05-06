<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as commentService from '@/services/comment'
import { getCurrentUser } from '@/services/auth'

const router = useRouter()
const loading = ref(false)
const stats = ref(null)

const daysOptions = [7, 14, 30, 60, 90]
const selectedDays = ref(30)

const currentUser = computed(() => getCurrentUser())

onMounted(() => {
  loadStats()
})

async function loadStats() {
  loading.value = true
  try {
    const result = await commentService.fetchCommentStats(selectedDays.value)
    stats.value = result?.data || null
  } catch (error) {
    ElMessage.error(error?.message || '加载统计数据失败')
  } finally {
    loading.value = false
  }
}

function handleDaysChange() {
  loadStats()
}

function goBack() {
  router.push('/admin/comments')
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}w`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return String(num)
}

function getTrendMax() {
  if (!stats.value?.dailyTrend?.length) return 1
  return Math.max(...stats.value.dailyTrend.map((item) => item.count || 0), 1)
}
</script>

<template>
  <main class="stats-page" v-loading="loading">
    <section class="stats-header">
      <div>
        <px-button plain size="small" :use-throttle="false" @click="goBack">
          返回管理
        </px-button>
        <h1 class="title">评论数据统计</h1>
        <p class="subtitle">当前登录：{{ currentUser?.username || '未知' }}</p>
      </div>

      <div class="days-selector">
        <px-text size="12" style="color: #6b7f87; margin-right: 8px">统计周期：</px-text>
        <el-select v-model="selectedDays" size="small" style="width: 120px" @change="handleDaysChange">
          <el-option v-for="days in daysOptions" :key="days" :label="`最近 ${days} 天`" :value="days" />
        </el-select>
      </div>
    </section>

    <template v-if="stats">
      <section class="overview-grid">
        <div class="stat-card primary">
          <div class="stat-icon">💬</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNumber(stats.totalComments) }}</div>
            <div class="stat-label">评论总数</div>
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon">⏳</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNumber(stats.pendingReview) }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">✅</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNumber(stats.approved) }}</div>
            <div class="stat-label">已通过</div>
          </div>
        </div>

        <div class="stat-card danger">
          <div class="stat-icon">🚫</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNumber(stats.rejected) }}</div>
            <div class="stat-label">已拒绝</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNumber(stats.todayComments) }}</div>
            <div class="stat-label">今日评论</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">👍</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNumber(stats.totalLikes) }}</div>
            <div class="stat-label">总点赞数</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.avgCommentsPerBlog?.toFixed(1) || '0' }}</div>
            <div class="stat-label">篇均评论</div>
          </div>
        </div>
      </section>

      <section class="charts-row">
        <div class="chart-card">
          <h3 class="chart-title">评论趋势</h3>
          <div class="trend-chart" v-if="stats.dailyTrend?.length">
            <div
              v-for="(item, index) in stats.dailyTrend"
              :key="item.date"
              class="trend-bar-wrapper"
            >
              <div
                class="trend-bar"
                :style="{ height: `${((item.count || 0) / getTrendMax()) * 100}%` }"
                :title="`${item.date}: ${item.count} 条`"
              ></div>
              <span class="trend-label">{{ item.date?.slice(5) }}</span>
            </div>
          </div>
          <div v-else class="chart-empty">暂无趋势数据</div>
        </div>
      </section>

      <section class="tables-row">
        <div class="table-card">
          <h3 class="card-title">热门博客 Top 5</h3>
          <el-table :data="stats.topBlogs?.slice(0, 5) || []" stripe border>
            <el-table-column type="index" label="#" width="60" />
            <el-table-column label="博客标题" min-width="200">
              <template #default="scope">
                {{ scope.row.blogTitle || `Blog #${scope.row.blogId}` }}
              </template>
            </el-table-column>
            <el-table-column label="评论数" width="120" align="center" prop="commentCount" />
          </el-table>
        </div>

        <div class="table-card">
          <h3 class="card-title">活跃评论者 Top 5</h3>
          <el-table :data="stats.topCommenters?.slice(0, 5) || []" stripe border>
            <el-table-column type="index" label="#" width="60" />
            <el-table-column label="用户名" min-width="120" prop="username" />
            <el-table-column label="评论数" width="100" align="center" prop="commentCount" />
            <el-table-column label="获赞数" width="100" align="center" prop="likeCount" />
          </el-table>
        </div>
      </section>
    </template>

    <div v-else class="empty-state">
      <px-text size="16" muted>暂无统计数据</px-text>
    </div>
  </main>
</template>

<style scoped>
.stats-page {
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(235, 240, 248, 0.96), rgba(242, 236, 226, 0.94)),
    radial-gradient(circle at top right, rgba(93, 62, 240, 0.12), transparent 30%),
    radial-gradient(circle at bottom left, rgba(47, 133, 90, 0.12), transparent 28%);
}

.stats-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 24px;
  align-items: flex-start;
}

.title {
  margin: 8px 0 6px;
  color: #213547;
  font-size: clamp(1.8rem, 4vw, 3rem);
}

.subtitle {
  margin: 0;
  color: #385b66;
  font-size: 14px;
}

.days-selector {
  display: flex;
  align-items: center;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 14px;
  border: 1px solid rgba(56, 91, 102, 0.1);
  transition: transform 0.15s, box-shadow 0.15s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

.stat-card.primary {
  border-color: rgba(93, 62, 240, 0.25);
  background: rgba(93, 62, 240, 0.06);
}

.stat-card.warning {
  border-color: rgba(237, 137, 54, 0.25);
  background: rgba(237, 137, 54, 0.06);
}

.stat-card.success {
  border-color: rgba(47, 133, 90, 0.25);
  background: rgba(47, 133, 90, 0.06);
}

.stat-card.danger {
  border-color: rgba(229, 62, 62, 0.25);
  background: rgba(229, 62, 62, 0.06);
}

.stat-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #213547;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #6b7f87;
  margin-top: 4px;
}

.charts-row {
  margin-bottom: 24px;
}

.chart-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 14px;
  border: 1px solid rgba(56, 91, 102, 0.1);
}

.chart-title {
  margin: 0 0 16px;
  color: #213547;
  font-size: 16px;
  font-weight: 700;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 160px;
  padding: 0 4px;
}

.trend-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
  justify-content: flex-end;
}

.trend-bar {
  width: 100%;
  max-width: 32px;
  min-height: 4px;
  background: linear-gradient(180deg, #7c4dff, #5d3ef0);
  border-radius: 6px 6px 0 0;
  transition: height 0.3s;
}

.trend-bar:hover {
  background: linear-gradient(180deg, #9c7fff, #7c4dff);
}

.trend-label {
  font-size: 10px;
  color: #9ca3af;
  white-space: nowrap;
}

.chart-empty {
  text-align: center;
  padding: 40px 0;
  color: #9ca3af;
}

.tables-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 20px;
}

.table-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 14px;
  border: 1px solid rgba(56, 91, 102, 0.1);
}

.card-title {
  margin: 0 0 16px;
  color: #213547;
  font-size: 16px;
  font-weight: 700;
}

.empty-state {
  text-align: center;
  padding: 80px 0;
}

@media (max-width: 768px) {
  .stats-page {
    padding: 16px;
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tables-row {
    grid-template-columns: 1fr;
  }
}
</style>
