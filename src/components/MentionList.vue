<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyFollowees } from '@/services/follow'

const emit = defineEmits(['select'])

const followees = ref([])
const loading = ref(false)
const loaded = ref(false)
const keyword = ref('')
const popoverVisible = ref(false)

const filtered = computed(() => {
  if (!keyword.value.trim()) return followees.value
  const kw = keyword.value.trim().toLowerCase()
  return followees.value.filter(f => f.username.toLowerCase().includes(kw))
})

async function load() {
  if (loaded.value) return
  loading.value = true
  try {
    const result = await getMyFollowees()
    followees.value = result?.data || []
    loaded.value = true
  } catch (error) {
    ElMessage.error(error?.message || '加载关注列表失败')
  } finally {
    loading.value = false
  }
}

function handleOpen() {
  keyword.value = ''
  load()
}

function selectUser(user) {
  popoverVisible.value = false
  emit('select', user.username)
}
</script>

<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="top"
    :width="280"
    trigger="click"
    @show="handleOpen"
  >
    <template #reference>
      <span class="mention-btn" title="提及关注的人">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <path d="M20 8v6m-3-3h6"/>
        </svg>
      </span>
    </template>

    <div class="mention-popover">
      <el-input
        v-model="keyword"
        placeholder="搜索关注的人..."
        size="small"
        clearable
        class="mention-search"
      />
      <div class="mention-list" v-loading="loading">
        <div
          v-for="user in filtered"
          :key="user.userId"
          class="mention-item"
          @click="selectUser(user)"
        >
          <img v-if="user.avatarUrl" :src="user.avatarUrl" class="mention-avatar" />
          <div v-else class="mention-avatar mention-avatar-placeholder">
            {{ user.username?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <span class="mention-name">@{{ user.username }}</span>
        </div>
        <div v-if="!loading && filtered.length === 0" class="mention-empty">
          没有匹配的关注用户
        </div>
      </div>
    </div>
  </el-popover>
</template>

<style scoped>
.mention-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 0.15s;
  flex-shrink: 0;
}

.mention-btn:hover {
  background: var(--tag-bg);
  color: var(--color-accent);
}

.mention-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mention-search {
  width: 100%;
}

.mention-list {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}

.mention-item:hover {
  background: var(--tag-bg);
}

.mention-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.mention-avatar-placeholder {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
}

.mention-name {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.mention-empty {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
  padding: 20px 0;
}
</style>
