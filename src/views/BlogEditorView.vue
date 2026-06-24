<script setup>
/**
 * 博客编辑页
 * 功能：创建新博客、编辑已有博客
 */

import { onMounted, ref, computed, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { PxMessage } from '@mmt817/pixel-ui'
import EmojiPicker from '@/components/EmojiPicker.vue'

const route = useRoute()
const router = useRouter()
const blogStore = useBlogStore()
const categoryStore = useCategoryStore()
const tagStore = useTagStore()

// 从路由参数获取博客 ID
const blogId = computed(() => route.params.id)

// 是否编辑模式
const isEditMode = computed(() => !!blogId.value)

// 加载状态
const isLoading = ref(false)

// 保存状态
const isSaving = ref(false)

// 表单数据
const form = reactive({
  title: '',
  content: '',
  categoryId: null,
  tags: [],
})

const tagInput = ref('')
const showTagSuggestions = ref(false)

function addTag(tag) {
  if (!form.tags.find(t => t.id === tag.id || t.name === tag.name)) {
    form.tags.push({ id: tag.id, name: tag.name })
  }
  tagInput.value = ''
  showTagSuggestions.value = false
}

function removeTag(tag) {
  form.tags = form.tags.filter(t => t.id !== tag.id && t.name !== tag.name)
}

function onTagInput() {
  if (tagInput.value.trim()) {
    tagStore.search(tagInput.value.trim())
    showTagSuggestions.value = true
  } else {
    showTagSuggestions.value = false
  }
}

function selectTagSuggestion(tag) {
  addTag(tag)
}

function onTagKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    const name = tagInput.value.trim()
    if (name) {
      if (tagStore.suggestions.length > 0 && tagInput.value) {
        selectTagSuggestion(tagStore.suggestions[0])
      } else {
        addTag({ id: null, name })
      }
    }
  }
}

// 计算字数
const titleLength = computed(() => form.title?.length || 0)
const contentLength = computed(() => form.content?.length || 0)
const contentRemaining = computed(() => 10000 - contentLength.value)

// 组件挂载时加载博客数据和分类
onMounted(async () => {
  categoryStore.fetchCategories()
  if (isEditMode.value) {
    isLoading.value = true
    try {
      const blog = await blogStore.fetchBlogDetail(blogId.value)
      if (blog) {
        form.title = blog.title || ''
        form.content = blog.content || ''
        form.categoryId = blog.categoryId || null
        form.tags = blog.tags || []
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

  isSaving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      categoryId: form.categoryId,
      tags: form.tags.map(t => ({ id: t.id, name: t.name })),
    }

    if (isEditMode.value) {
      await blogStore.updateBlog(blogId.value, payload)
      PxMessage.success('博客更新成功')
      router.push(`/blog/${blogId.value}`)
    } else {
      await blogStore.createBlog(payload)
      PxMessage.success('博客发布成功')
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
      form.categoryId = blogStore.currentBlog.categoryId || null
      form.tags = blogStore.currentBlog.tags || []
    }
  } else {
    form.title = ''
    form.content = ''
    form.categoryId = null
    form.tags = []
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

        <!-- 分类 -->
        <label class="form-field">
          <div class="field-header">
            <span class="field-label">分类</span>
          </div>
          <select v-model="form.categoryId" class="category-select">
            <option :value="null">无分类</option>
            <option
              v-for="cat in categoryStore.flatCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </label>

        <!-- 标签 -->
        <label class="form-field">
          <div class="field-header">
            <span class="field-label">标签</span>
          </div>
          <div class="tag-input-wrapper">
            <div class="tag-list">
              <span v-for="tag in form.tags" :key="tag.name" class="tag-chip">
                {{ tag.name }}
                <button class="tag-remove" @click="removeTag(tag)">&times;</button>
              </span>
              <input
                v-model="tagInput"
                class="tag-input-inline"
                placeholder="输入标签后回车"
                @input="onTagInput"
                @keydown="onTagKeydown"
                @focus="onTagInput"
                @blur="setTimeout(() => showTagSuggestions = false, 200)"
              />
            </div>
            <div v-if="showTagSuggestions && tagStore.suggestions.length" class="tag-suggestions">
              <div
                v-for="tag in tagStore.suggestions"
                :key="tag.id"
                class="tag-suggestion-item"
                @mousedown.prevent="selectTagSuggestion(tag)"
              >
                {{ tag.name }}
              </div>
            </div>
          </div>
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
  background:
    linear-gradient(180deg, rgba(247, 244, 239, 0.82), rgba(224, 235, 247, 0.82)),
    radial-gradient(circle at top left, #f9d8d6 0, transparent 28%),
    radial-gradient(circle at bottom right, #c7f0d8 0, transparent 24%),
    #ebe6e0;
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
  color: #385b66;
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

.category-select {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid rgba(56, 91, 102, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: #385b66;
  font-size: 14px;
  outline: none;
  transition: border-color 0.18s;
}

.category-select:focus {
  border-color: #7c4dff;
}

.tag-input-wrapper {
  position: relative;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  border: 2px solid rgba(56, 91, 102, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  min-height: 42px;
  align-items: center;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(124, 77, 255, 0.12);
  color: #5d3ef0;
  font-size: 13px;
  font-weight: 600;
}

.tag-remove {
  border: none;
  background: none;
  color: #5d3ef0;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  line-height: 1;
}

.tag-input-inline {
  flex: 1;
  min-width: 120px;
  border: none;
  outline: none;
  padding: 4px;
  font-size: 13px;
  background: transparent;
  color: #385b66;
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin-top: 4px;
  border: 1px solid rgba(56, 91, 102, 0.12);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  max-height: 200px;
  overflow-y: auto;
}

.tag-suggestion-item {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #385b66;
  transition: background 0.12s;
}

.tag-suggestion-item:hover {
  background: rgba(124, 77, 255, 0.08);
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