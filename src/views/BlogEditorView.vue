<script setup>
/**
 * 博客编辑页
 * 功能：创建新博客、编辑已有博客，支持专栏选择、分类选择与定时发布
 */

import { onMounted, ref, computed, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { PxMessage } from '@mmt817/pixel-ui'
import EmojiPicker from '@/components/EmojiPicker.vue'
import { getAllSeries } from '@/services/blog'
import { CATEGORIES } from '@/config/categories'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()

// 从路由参数获取博客 ID
const blogId = computed(() => route.params.id)

// 是否编辑模式
const isEditMode = computed(() => !!blogId.value)

// 加载状态
const isLoading = ref(false)

// 保存状态
const isSaving = ref(false)

// 专栏列表
const seriesOptions = ref([])

// 是否显示定时发布
const showSchedule = ref(false)

// 表单数据
const form = reactive({
  title: '',
  content: '',
  seriesId: '',
  category: '',
  scheduledAt: '',
})

// 计算字数
const titleLength = computed(() => form.title?.length || 0)
const contentLength = computed(() => form.content?.length || 0)
const contentRemaining = computed(() => 10000 - contentLength.value)

// 加载专栏列表
async function loadSeries() {
  try {
    const result = await getAllSeries()
    seriesOptions.value = result.data?.list || result.data || []
  } catch {
    seriesOptions.value = []
  }
}

// 组件挂载时加载博客数据
onMounted(async () => {
  loadSeries()
  if (isEditMode.value) {
    isLoading.value = true
    try {
      const blog = await blogStore.fetchBlogDetail(blogId.value)
      if (blog) {
        form.title = blog.title || ''
        form.content = blog.content || ''
        form.seriesId = blog.seriesId || ''
        form.category = blog.category || ''
        if (blog.scheduledAt) {
          form.scheduledAt = blog.scheduledAt
          showSchedule.value = true
        }
      }
    } catch (err) {
      PxMessage.error(err.message || '加载博客失败')
    } finally {
      isLoading.value = false
    }
  }
})

// 返回上一页
function goBack() {
  if (isEditMode.value) {
    router.push(`/blog/${blogId.value}`)
  } else {
    router.push('/blogs')
  }
}

// 提交表单
async function handleSubmit() {
  if (!form.title.trim()) {
    PxMessage.warning('请输入博客标题')
    return
  }

  if (!form.content.trim()) {
    PxMessage.warning('请输入博客内容')
    return
  }

  if (showSchedule.value && !form.scheduledAt) {
    PxMessage.warning('请选择定时发布时间')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      seriesId: form.seriesId || undefined,
      category: form.category || undefined,
      scheduledAt: showSchedule.value ? form.scheduledAt : undefined,
    }

    if (isEditMode.value) {
      await blogStore.updateBlog(blogId.value, payload)
      PxMessage.success('博客更新成功')
      router.push(`/blog/${blogId.value}`)
    } else {
      const result = await blogStore.createBlog(payload)
      const isScheduled = showSchedule.value && form.scheduledAt
      if (isScheduled) {
        PxMessage.success('定时发布已设置')
      } else {
        PxMessage.success('博客发布成功')
      }
      router.push('/blogs')
    }
  } catch (err) {
    PxMessage.error(err.message || '操作失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}

// 重置表单
const contentInputRef = ref(null)

function insertAtCursor(textarea, emoji, target, key) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  target[key] = target[key].substring(0, start) + emoji + target[key].substring(end)
  nextTick(() => {
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length
  })
}

function onEmojiSelect(emoji) {
  const textarea = contentInputRef.value?.$el?.querySelector('textarea')
    ?? contentInputRef.value?.$el?.querySelector('.px-textarea')
  if (textarea && document.activeElement === textarea) {
    insertAtCursor(textarea, emoji, form, 'content')
  } else {
    form.content += emoji
  }
}

function handleReset() {
  if (isEditMode.value) {
    if (blogStore.currentBlog) {
      form.title = blogStore.currentBlog.title || ''
      form.content = blogStore.currentBlog.content || ''
      form.seriesId = blogStore.currentBlog.seriesId || ''
      form.category = blogStore.currentBlog.category || ''
      if (blogStore.currentBlog.scheduledAt) {
        form.scheduledAt = blogStore.currentBlog.scheduledAt
        showSchedule.value = true
      }
    }
  } else {
    form.title = ''
    form.content = ''
    form.seriesId = ''
    form.category = ''
    form.scheduledAt = ''
    showSchedule.value = false
  }
}
</script>

<template>
  <main class="blog-editor-page">
    <!-- 页面头部 -->
    <section class="page-header">
      <div class="header-left">
        <px-button plain @click="goBack">
          <template #prepend>
            <px-icon icon="arrow-left-solid" size="16" />
          </template>
          返回
        </px-button>
        <px-text tag="h1" size="18">{{ isEditMode ? '编辑博客' : '写博客' }}</px-text>
      </div>
      <div class="header-actions">
        <px-button plain @click="handleReset">重置</px-button>
        <px-button type="primary" :loading="isSaving" @click="handleSubmit">
          <template #prepend>
            <px-icon icon="check-solid" size="16" />
          </template>
          {{ isEditMode ? '保存修改' : '发布' }}
        </px-button>
      </div>
    </section>

    <!-- 编辑表单 -->
    <px-card class="editor-card" v-loading="isLoading">
      <div class="editor-form">
        <!-- 标题字段 -->
        <label class="form-field">
          <div class="field-header">
            <span class="field-label">标题</span>
            <px-text size="12" type="secondary">{{ titleLength }}/100</px-text>
          </div>
          <px-input
            v-model="form.title"
            placeholder="输入博客标题"
            size="large"
            clearable
            maxlength="100"
          />
        </label>

        <!-- 分类选择 -->
        <label class="form-field">
          <div class="field-header">
            <span class="field-label">分类</span>
          </div>
          <el-select
            v-model="form.category"
            placeholder="选择分类（可选）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="cat in CATEGORIES"
              :key="cat.value"
              :value="cat.value"
            >
              <span style="margin-right: 8px">{{ cat.icon }}</span>
              <span>{{ cat.label }}</span>
            </el-option>
          </el-select>
        </label>

        <!-- 专栏选择 -->
        <label class="form-field">
          <div class="field-header">
            <span class="field-label">所属专栏</span>
          </div>
          <el-select
            v-model="form.seriesId"
            placeholder="选择专栏（可选）"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="s in seriesOptions"
              :key="s.id"
              :value="s.id"
              :label="s.name"
            />
          </el-select>
        </label>

        <!-- 定时发布 -->
        <label class="form-field">
          <div class="field-header">
            <span class="field-label">定时发布</span>
            <px-button plain size="small" @click="showSchedule = !showSchedule">
              {{ showSchedule ? '取消定时' : '设置定时' }}
            </px-button>
          </div>
          <template v-if="showSchedule">
            <el-date-picker
              v-model="form.scheduledAt"
              type="datetime"
              placeholder="选择定时发布时间"
              :disabled-date="(time) => time.getTime() < Date.now() - 86400000"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
            />
            <px-text v-if="form.scheduledAt" size="12" type="secondary">
              博客将在 {{ new Date(form.scheduledAt).toLocaleString('zh-CN') }} 自动发布
            </px-text>
          </template>
        </label>

        <!-- 内容字段 -->
        <label class="form-field content-field">
          <div class="field-header">
            <span class="field-label">内容</span>
            <px-text size="12" type="secondary">
              {{ contentLength }} 字
              <template v-if="contentRemaining > 0">，剩余 {{ contentRemaining }} 字</template>
              <template v-else>（已达上限）</template>
            </px-text>
          </div>
          <div class="content-input-wrapper">
            <px-input
              ref="contentInputRef"
              v-model="form.content"
              type="textarea"
              :rows="20"
              placeholder="在这里编写你的博客内容..."
              resize="vertical"
            />
            <EmojiPicker class="content-emoji-btn" @select="onEmojiSelect" />
          </div>
        </label>
      </div>
    </px-card>
  </main>
</template>

<style scoped>
.blog-editor-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  background: var(--bg-page);
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.editor-card {
  width: 100%;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-label {
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 700;
}

.content-field {
  flex: 1;
}

.content-input-wrapper {
  position: relative;
}

.content-emoji-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
}

.content-field :deep(.px-textarea) {
  min-height: 400px;
  font-size: 15px;
  line-height: 1.8;
}

@media (max-width: 640px) {
  .blog-editor-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
