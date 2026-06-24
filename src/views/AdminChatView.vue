<script setup>
/**
 * 聊天室管理后台组件 - 管理员专用
 * 功能：群组管理、消息管理、成员权限管理、群组解散等
 * 仅限管理员角色访问，普通用户会被重定向
 */

// ==================== 依赖导入 ====================
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'  // Vue Router - 页面导航
import { PxMessage } from '@mmt817/pixel-ui'  // UI组件库的消息提示
// 导入管理员专用的聊天API（区别于普通用户的聊天API）
import {
  getAdminChatGroups,      // 获取所有群组列表（管理员视角）
  getAdminChatGroupDetail, // 获取群组详情（包含成员信息）
  getAdminChatMessages,    // 获取所有消息列表（全局视角）
  dismissChatGroup,        // 解散群组（管理员特权）
  banUserFromGroup,        // 将用户移出群组并可选禁言
  setGroupMemberRole,      // 设置成员角色（成员/管理员）
  adminDeleteMessage,      // 删除任何消息（管理员特权）
  getAccessToken,          // 获取认证令牌
  getCurrentUser,          // 获取当前用户信息
  isAdminUser,             // 检查是否为管理员
} from '@/services/chat'

// ==================== 响应式状态 ====================
const router = useRouter()
// computed 计算属性 - 依赖其他数据自动更新
const currentUser = computed(() => getCurrentUser())
const token = computed(() => getAccessToken())

// UI状态控制
const activeTab = ref('groups')      // 当前标签页：groups-群组管理 messages-消息管理
const loading = ref(false)            // 全局加载状态
const savingId = ref(null)            // 正在操作的记录ID（用于按钮防重复提交）

// 数据存储
const groups = ref([])                // 群组列表数据
const messages = ref([])              // 消息列表数据
const currentGroup = ref(null)        // 当前查看详情的群组
const total = ref(0)                  // 数据总条数（用于分页）

// 群组查询参数 - 使用 reactive 管理多个相关参数
const query = reactive({
  page: 1,          // 当前页码
  size: 10,         // 每页条数
  keyword: '',      // 搜索关键词
})

// 消息查询参数
const messageQuery = reactive({
  page: 1,
  size: 20,
  keyword: '',
  groupId: '',      // 按群组筛选（预留字段）
  userId: '',       // 按用户筛选（预留字段）
})

// 移出/禁言弹窗相关
const showBanModal = ref(false)
const banForm = reactive({
  userId: '',       // 被移出的用户ID
  reason: '',       // 移出原因
  duration: '',     // 禁言时长（分钟）
})

// 权限检查：只有管理员才能访问此页面
const canEnterAdmin = computed(() => isAdminUser())

// ==================== 生命周期钩子 ====================
/**
 * 组件挂载时的初始化
 * 进行权限验证，非管理员直接跳转回欢迎页
 */
onMounted(() => {
  // 权限守卫：检查当前用户是否有管理员权限
  if (!canEnterAdmin.value) {
    router.push('/welcome')  // 无权限，跳转回首页
    return
  }
  loadGroups()  // 加载群组列表
})

// ==================== 数据加载函数 ====================

/**
 * 加载群组列表（管理员视角）
 * 可以看到系统中所有的群组，不受用户所属群组限制
 */
async function loadGroups() {
  loading.value = true  // 显示加载动画
  try {
    // 调用管理员API获取所有群组
    const result = await getAdminChatGroups(query, token.value)
    groups.value = result?.data?.list || []
    total.value = result?.data?.total || 0
  } catch (error) {
    PxMessage.error(error?.message || '加载群组列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载消息列表（管理员视角）
 * 可以看到系统中所有群组的消息，支持搜索过滤
 */
async function loadMessages() {
  loading.value = true
  try {
    const result = await getAdminChatMessages(messageQuery, token.value)
    messages.value = result?.data?.list || []
    total.value = result?.data?.total || 0
  } catch (error) {
    PxMessage.error(error?.message || '加载消息列表失败')
  } finally {
    loading.value = false
  }
}

// ==================== 搜索与筛选 ====================

/**
 * 群组搜索 - 重置页码并重新加载
 */
function handleSearch() {
  query.page = 1  // 重置到第一页
  loadGroups()    // 重新加载数据
}

/**
 * 消息搜索 - 重置页码并重新加载
 */
function handleMessageSearch() {
  messageQuery.page = 1
  loadMessages()
}

// ==================== 群组管理操作 ====================

/**
 * 查看群组详情
 * 弹出对话框显示群组信息和成员列表
 * @param {string} groupId - 群组ID
 */
async function viewGroupDetail(groupId) {
  loading.value = true
  try {
    // 获取群组详细信息（包含成员列表）
    const result = await getAdminChatGroupDetail(groupId, token.value)
    currentGroup.value = result?.data  // 赋值后会触发对话框显示
  } catch (error) {
    PxMessage.error(error?.message || '加载群组详情失败')
  } finally {
    loading.value = false
  }
}

/**
 * 解散群组（危险操作）
 * @param {string} groupId - 要解散的群组ID
 * 
 * 注意：此操作不可恢复，会删除所有群组数据和消息
 */
async function handleDismissGroup(groupId) {
  // 使用原生 confirm 进行二次确认
  if (!confirm('确定要解散此群组吗？此操作不可恢复。')) return

  savingId.value = groupId  // 记录正在操作的群组ID，防止重复提交
  try {
    await dismissChatGroup(groupId, token.value)
    PxMessage.success('群组已解散')
    currentGroup.value = null  // 关闭详情弹窗
    await loadGroups()         // 刷新列表
  } catch (error) {
    PxMessage.error(error?.message || '解散群组失败')
  } finally {
    savingId.value = null  // 清除操作标记
  }
}

// ==================== 成员管理操作 ====================

/**
 * 打开移出用户弹窗
 * @param {string} userId - 要移出的用户ID
 */
function openBanModal(userId) {
  banForm.userId = userId
  banForm.reason = ''      // 清空上次输入
  banForm.duration = ''    // 清空上次输入
  showBanModal.value = true
}

/**
 * 移出用户并可选禁言
 * 将用户从群组中移除，可以选择禁言时长
 */
async function handleBanUser() {
  if (!currentGroup.value) return

  savingId.value = banForm.userId
  try {
    // 调用API移出用户，duration为空或0表示永久移出
    await banUserFromGroup(
      currentGroup.value.group_id,
      { 
        userId: banForm.userId, 
        reason: banForm.reason, 
        duration: banForm.duration ? parseInt(banForm.duration) : null 
      },
      token.value
    )
    PxMessage.success('已将用户移出群组')
    showBanModal.value = false
    // 重新加载群组详情，刷新成员列表
    await viewGroupDetail(currentGroup.value.group_id)
  } catch (error) {
    PxMessage.error(error?.message || '操作失败')
  } finally {
    savingId.value = null
  }
}

/**
 * 设置成员角色
 * @param {string} userId - 用户ID
 * @param {string} role - 角色类型：'admin'(管理员) 或 'member'(普通成员)
 * 
 * 注意：群主(role=3)的角色不可修改
 */
async function handleSetRole(userId, role) {
  if (!currentGroup.value) return

  savingId.value = userId
  try {
    await setGroupMemberRole(
      currentGroup.value.group_id, 
      { userId, role }, 
      token.value
    )
    PxMessage.success('权限已更新')
    // 重新加载群组详情，刷新成员角色显示
    await viewGroupDetail(currentGroup.value.group_id)
  } catch (error) {
    PxMessage.error(error?.message || '操作失败')
  } finally {
    savingId.value = null
  }
}

// ==================== 消息管理操作 ====================

/**
 * 删除消息（管理员特权）
 * 管理员可以删除任何用户发送的消息
 * @param {string} messageId - 消息ID
 */
async function handleDeleteMessage(messageId) {
  if (!confirm('确定要删除此消息吗？')) return

  savingId.value = messageId
  try {
    await adminDeleteMessage(messageId, token.value)
    PxMessage.success('消息已删除')
    await loadMessages()  // 刷新消息列表
  } catch (error) {
    PxMessage.error(error?.message || '删除消息失败')
  } finally {
    savingId.value = null
  }
}

// ==================== 分页处理 ====================

/**
 * 页码改变处理
 * @param {number} page - 新的页码
 */
function handlePageChange(page) {
  query.page = page
  loadGroups()
}

/**
 * 每页条数改变处理
 * @param {number} size - 新的每页条数
 */
function handleSizeChange(size) {
  query.size = size
  query.page = 1   // 改变页容量时重置到第一页
  loadGroups()
}

// ==================== 辅助函数 ====================

/**
 * 格式化时间显示
 * @param {string} dateString - ISO时间字符串
 * @returns {string} 本地化时间字符串
 */
function formatTime(dateString) {
  if (!dateString) return ''
  // toLocaleString('zh-CN') 返回如 "2024/1/15 14:30:25" 格式
  return new Date(dateString).toLocaleString('zh-CN')
}

/**
 * 返回欢迎页
 */
function goBack() {
  router.push('/welcome')
}
</script>

<template>
  <!-- 
    管理员聊天室管理页面
    包含两大模块：群组管理、消息管理
  -->
  <main class="admin-chat-page">
    <!-- ==================== 页面头部 ==================== -->
    <section class="admin-hero">
      <div>
        <p class="eyebrow">Chat Admin</p>
        <h1 class="title">聊天室管理</h1>
        <p class="subtitle">
          当前登录用户：{{ currentUser?.username || currentUser?.email || '未知' }}
          <!-- 使用可选链操作符 ?. 安全访问嵌套属性 -->
        </p>
      </div>
    </section>

    <!-- ==================== 标签页切换 ==================== -->
    <section class="admin-tabs">
      <!-- 
        群组管理标签页
        :class 动态绑定，激活的标签页高亮显示
        @click 切换标签页时重新加载对应数据
      -->
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'groups' }" 
        @click="activeTab = 'groups'; loadGroups()"
      >
        群组管理
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'messages' }" 
        @click="activeTab = 'messages'; loadMessages()"
      >
        消息管理
      </button>
    </section>

    <!-- ==================== 群组管理模块 ==================== -->
    <section v-if="activeTab === 'groups'" class="admin-content">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <!-- 
          v-model 双向绑定搜索关键词
          clearable 显示清空按钮
          @keyup.enter 回车触发搜索
        -->
        <px-input 
          v-model="query.keyword" 
          placeholder="搜索群组名称" 
          clearable 
          @keyup.enter="handleSearch" 
        />
        <px-button type="primary" @click="handleSearch">搜索</px-button>
      </div>

      <!-- 数据卡片容器 -->
      <px-card class="data-card">
        <!-- v-loading 指令：加载时显示骨架屏或加载动画 -->
        <div v-loading="loading" class="data-list">
          <!-- 表格头部 - 使用CSS Grid布局 -->
          <div class="data-header">
            <span class="col-name">群组名称</span>
            <span class="col-type">类型</span>
            <span class="col-owner">群主</span>
            <span class="col-members">成员数</span>
            <span class="col-time">创建时间</span>
            <span class="col-action">操作</span>
          </div>
          
          <!-- 
            数据行 - v-for 循环渲染
            :key 绑定唯一标识，优化渲染性能
          -->
          <div v-for="group in groups" :key="group.group_id" class="data-row">
            <span class="col-name">{{ group.group_name }}</span>
            <span class="col-type">
              <!-- 动态标签：根据群组类型显示不同颜色 -->
              <px-tag :type="group.group_type === 1 ? 'primary' : 'info'">
                {{ group.group_type === 1 ? '群组' : '私聊' }}
              </px-tag>
            </span>
            <span class="col-owner">{{ group.owner_name }}</span>
            <span class="col-members">{{ group.member_count }}</span>
            <span class="col-time">{{ formatTime(group.created_at) }}</span>
            <span class="col-action">
              <px-button size="small" type="primary" plain @click="viewGroupDetail(group.group_id)">
                详情
              </px-button>
              <!-- 
                :loading 动态属性：操作时显示加载状态，防止重复点击
                使用 savingId === group.group_id 精确控制当前行的按钮状态
              -->
              <px-button 
                size="small" 
                type="danger" 
                plain 
                :loading="savingId === group.group_id" 
                @click="handleDismissGroup(group.group_id)"
              >
                解散
              </px-button>
            </span>
          </div>
          
          <!-- 空状态提示 -->
          <div v-if="groups.length === 0 && !loading" class="empty-tip">
            <px-text size="12">暂无群组数据</px-text>
          </div>
        </div>

        <!-- 分页组件 -->
        <div class="pager-row">
          <span class="pager-summary">共 {{ total }} 条</span>
          <!-- 
            Element Plus 分页组件
            layout 指定显示哪些控件
            background 显示背景色
          -->
          <el-pagination
            :current-page="query.page"
            :page-size="query.size"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="sizes, prev, pager, next"
            background
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </px-card>
    </section>

    <!-- ==================== 消息管理模块 ==================== -->
    <section v-if="activeTab === 'messages'" class="admin-content">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <px-input 
          v-model="messageQuery.keyword" 
          placeholder="搜索消息内容" 
          clearable 
          @keyup.enter="handleMessageSearch" 
        />
        <px-button type="primary" @click="handleMessageSearch">搜索</px-button>
      </div>

      <px-card class="data-card">
        <div v-loading="loading" class="data-list">
          <!-- 消息表格头部 -->
          <div class="data-header">
            <span class="col-sender">发送者</span>
            <span class="col-group">群组</span>
            <span class="col-content">消息内容</span>
            <span class="col-time">发送时间</span>
            <span class="col-action">操作</span>
          </div>
          
          <!-- 消息数据行 -->
          <div v-for="msg in messages" :key="msg.message_id" class="data-row">
            <span class="col-sender">{{ msg.sender_username }}</span>
            <span class="col-group">{{ msg.group_name }}</span>
            <!-- 非文本消息显示占位符 -->
            <span class="col-content">{{ msg.content || '[文件/图片]' }}</span>
            <span class="col-time">{{ formatTime(msg.created_at) }}</span>
            <span class="col-action">
              <px-button 
                size="small" 
                type="danger" 
                plain 
                :loading="savingId === msg.message_id" 
                @click="handleDeleteMessage(msg.message_id)"
              >
                删除
              </px-button>
            </span>
          </div>
          
          <div v-if="messages.length === 0 && !loading" class="empty-tip">
            <px-text size="12">暂无消息数据</px-text>
          </div>
        </div>
      </px-card>
    </section>

    <!-- ==================== 群组详情弹窗 ==================== -->
    <!-- 
      v-model="currentGroup" 控制弹窗显示
      当 currentGroup 有值时弹窗显示，为 null 时关闭
    -->
    <px-dialog 
      v-model="currentGroup" 
      :title="currentGroup?.group_name || '群组详情'" 
      width="640px"
    >
      <template v-if="currentGroup">
        <div class="group-detail">
          <!-- 基本信息区块 -->
          <div class="detail-section">
            <px-text size="14" weight="bold">基本信息</px-text>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">群组名称</span>
                <span class="detail-value">{{ currentGroup.group_name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">类型</span>
                <span class="detail-value">
                  <px-tag :type="currentGroup.group_type === 1 ? 'primary' : 'info'">
                    {{ currentGroup.group_type === 1 ? '群组' : '私聊' }}
                  </px-tag>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">群主</span>
                <span class="detail-value">{{ currentGroup.owner_name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">消息数</span>
                <span class="detail-value">{{ currentGroup.messageCount }}</span>
              </div>
            </div>
          </div>

          <!-- 成员列表区块 -->
          <div class="detail-section">
            <px-text size="14" weight="bold">成员列表 ({{ currentGroup.members?.length || 0 }})</px-text>
            <div class="member-list">
              <!-- 
                成员行
                v-for 循环展示每个成员
              -->
              <div v-for="member in currentGroup.members" :key="member.user_id" class="member-row">
                <div class="member-info">
                  <px-text size="13" weight="bold">{{ member.username }}</px-text>
                  <px-text size="11">{{ member.email }}</px-text>
                </div>
                <div class="member-role">
                  <!-- 角色标签：群主打warning色，管理员info色，成员success色 -->
                  <px-tag v-if="member.role === 3" type="warning">群主</px-tag>
                  <px-tag v-else-if="member.role === 2" type="info">管理员</px-tag>
                  <px-tag v-else type="success">成员</px-tag>
                </div>
                <div class="member-actions">
                  <!-- 
                    设为管理员按钮：仅对普通成员显示
                    v-if="member.role === 1"
                  -->
                  <px-button
                    v-if="member.role === 1"
                    size="small"
                    plain
                    :loading="savingId === member.user_id"
                    @click="handleSetRole(member.user_id, 'admin')"
                  >
                    设为管理员
                  </px-button>
                  <!-- 
                    取消管理员：仅对管理员显示
                    v-else-if="member.role === 2"
                  -->
                  <px-button
                    v-else-if="member.role === 2"
                    size="small"
                    plain
                    :loading="savingId === member.user_id"
                    @click="handleSetRole(member.user_id, 'member')"
                  >
                    取消管理员
                  </px-button>
                  <!-- 
                    移出按钮：群主不能移出（v-if="member.role !== 3"）
                  -->
                  <px-button
                    v-if="member.role !== 3"
                    size="small"
                    type="danger"
                    plain
                    :loading="savingId === member.user_id"
                    @click="openBanModal(member.user_id)"
                  >
                    移出
                  </px-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <!-- 弹窗底部按钮 -->
      <template #footer>
        <px-button type="danger" @click="handleDismissGroup(currentGroup.group_id)">
          解散群组
        </px-button>
        <px-button plain @click="currentGroup = null">关闭</px-button>
      </template>
    </px-dialog>

    <!-- ==================== 移出用户弹窗 ==================== -->
    <px-dialog v-model="showBanModal" title="移出用户" width="400px">
      <div class="ban-form">
        <!-- 移出原因输入 -->
        <label class="field-block">
          <span class="field-label">原因（可选）</span>
          <px-input v-model="banForm.reason" placeholder="输入移出原因" />
        </label>
        <!-- 禁言时长输入 -->
        <label class="field-block">
          <span class="field-label">禁言时长（分钟，输入0或不填为永久）</span>
          <!-- type="number" 限制只能输入数字 -->
          <px-input v-model="banForm.duration" type="number" placeholder="输入禁言时长" />
        </label>
      </div>
      <template #footer>
        <px-button plain @click="showBanModal = false">取消</px-button>
        <!-- 确认移出按钮：显示加载状态，防止重复提交 -->
        <px-button type="danger" :loading="savingId" @click="handleBanUser">
          确认移出
        </px-button>
      </template>
    </px-dialog>
  </main>
</template>

<style scoped>
/*
  scoped: 样式只作用于当前组件
  使用 scoped 后，Vue 会自动为元素添加 data-v-xxx 属性确保样式隔离
*/

.admin-chat-page {
  min-height: 100vh;
  padding: 24px;
  /* 
    背景设计：多层渐变叠加
    - 基础渐变：接近白色的半透明背景
    - 径向渐变：右上角淡紫色光晕
    - 径向渐变：左下角淡绿色光晕
    营造丰富的视觉层次感
  */
  background:
    linear-gradient(180deg, rgba(235, 240, 248, 0.96), rgba(242, 236, 226, 0.94)),
    radial-gradient(circle at top right, rgba(93, 62, 240, 0.12), transparent 30%),
    radial-gradient(circle at bottom left, rgba(47, 133, 90, 0.12), transparent 28%);
}

/* 页面头部样式 */
.admin-hero {
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 10px;
  letter-spacing: 0.14em;   /* 字母间距 */
  text-transform: uppercase; /* 全部大写 */
  color: #5d3ef0;
  font-size: 12px;
  font-weight: 800;
}

/* 响应式字体：clamp(min, preferred, max) */
.title {
  margin: 0;
  color: #213547;
  font-size: clamp(1.8rem, 4vw, 3rem);
}

.subtitle {
  margin: 10px 0 0;
  color: #385b66;
}

/* 标签页容器 */
.admin-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  border: 2px solid rgba(56, 91, 102, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
  color: #385b66;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tab-button:hover {
  border-color: rgba(56, 91, 102, 0.45);
}

/* 激活的标签页样式 */
.tab-button.active {
  border-color: #5d3ef0;
  color: #5d3ef0;
  background: rgba(93, 62, 240, 0.12);
}

/* 搜索栏：flex 布局 */
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

/* 数据卡片圆角 */
.data-card {
  border-radius: 18px;
}

/* 表格容器 - 使用flex列布局 */
.data-list {
  display: flex;
  flex-direction: column;
}

/* 
  表格头部 - 使用CSS Grid布局
  grid-template-columns: 定义每列的宽度比例
  2fr = 2份, 1fr = 1份
*/
.data-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr 1.5fr;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(56, 91, 102, 0.06);
  border-radius: 12px 12px 0 0;
  font-weight: 700;
  color: #385b66;
  font-size: 13px;
}

/* 表格行 - 使用相同的Grid布局 */
.data-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr 1.5fr;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.08);
  align-items: center;
}

/* 操作列：按钮组 */
.col-action {
  display: flex;
  gap: 8px;
}

/* 分页行 */
.pager-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.pager-summary {
  color: #6b7f87;
}

/* 空状态样式 */
.empty-tip {
  display: flex;
  justify-content: center;
  padding: 32px;
  color: #6b7f87;
}

/* ==================== 群组详情弹窗样式 ==================== */
.group-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 详情网格：2列布局 */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  color: #6b7f87;
  font-size: 12px;
}

.detail-value {
  color: #213547;
  font-weight: 600;
}

/* 成员列表样式 */
.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(56, 91, 102, 0.06);
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-role {
  width: 80px;  /* 固定宽度，保持对齐 */
}

.member-actions {
  display: flex;
  gap: 8px;
}

/* 移出弹窗表单样式 */
.ban-form {
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
  font-size: 13px;
}

/* ==================== 响应式设计 ==================== */
/* 
  移动端适配：屏幕宽度 ≤ 768px
  表格简化为2列布局，隐藏部分列
*/
@media (max-width: 768px) {
  .data-header,
  .data-row {
    /* 移动端只显示2列 */
    grid-template-columns: 1fr 1fr;
  }

  /* 隐藏第4、第5列（成员数、创建时间） */
  .data-header span:nth-child(4),
  .data-header span:nth-child(5),
  .data-row span:nth-child(4),
  .data-row span:nth-child(5) {
    display: none;
  }
}
</style>