<script setup>
/**
 * 博客编辑页
 * 功能：创建新博客、编辑已有博客
 */

import { onMounted, ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { useCategoryStore } from '@/stores/category'
import { useTagStore } from '@/stores/tag'
import { PxMessage } from '@mmt817/pixel-ui'
import { askAI } from '@/services/ai'
import { uploadBlogImage, deleteBlogImage } from '@/services/blog'

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

function createTagFromInput() {
  const name = tagInput.value.trim()
  if (name) {
    addTag({ id: null, name })
  }
}

function onTagKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (tagStore.suggestions.length > 0 && tagInput.value) {
      selectTagSuggestion(tagStore.suggestions[0])
    } else if (tagInput.value.trim()) {
      createTagFromInput()
    }
  } else if (e.key === 'Backspace' && !tagInput.value && form.tags.length > 0) {
    form.tags.pop()
  }
}

// 计算字数
const titleLength = computed(() => form.title?.length || 0)
const contentLength = computed(() => form.content?.length || 0)
const contentRemaining = computed(() => 10000 - contentLength.value)

// 组件挂载时加载博客数据
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
        syncImagesFromContent()
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

const fileInputRef = ref(null)
const contentInputRef = ref(null)
const titleInputRef = ref(null)
const uploadingImage = ref(false)

const uploadedImages = ref([])

function extractContentImages() {
  const urls = []
  const regex = /!\[.*?\]\((.+?)\)/g
  let match
  while ((match = regex.exec(form.content)) !== null) {
    if (!urls.includes(match[1])) {
      urls.push(match[1])
    }
  }
  return urls
}

function syncImagesFromContent() {
  uploadedImages.value = extractContentImages().map(u => ({ url: u }))
}

function triggerFilePicker() {
  fileInputRef.value?.click()
}

async function handleImageSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    PxMessage.warning('请选择图片文件')
    return
  }

  uploadingImage.value = true
  try {
    const res = await uploadBlogImage(file)
    const url = res?.data
    if (!url) {
      PxMessage.error('上传失败：未获取到图片地址')
      return
    }

    uploadedImages.value.push({ url })
    PxMessage.success('图片已添加')

    // 立即将图片 markdown 追加到内容末尾
    form.content += (form.content ? '\n\n' : '') + `![image](${url})`
  } catch (err) {
    PxMessage.error(err.message || '图片上传失败')
  } finally {
    uploadingImage.value = false
    event.target.value = ''
  }
}

async function handleDeleteImage(imageUrl) {
  try {
    await deleteBlogImage(imageUrl)
    uploadedImages.value = uploadedImages.value.filter(u => u.url !== imageUrl)
    form.content = form.content.replace(new RegExp(`!\\[.*?\\]\\(${escapeRegex(imageUrl)}\\)`, 'g'), '').trim()
    PxMessage.success('图片已删除')
  } catch (err) {
    PxMessage.error(err.message || '删除失败')
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const aiQuestion = ref('')
const aiResponse = ref('')
const aiLoading = ref(false)
const aiPanelOpen = ref(false)
const aiAbortController = ref(null)

const lastReplacedText = ref(null)

const aiPreamblePattern = /^(?:好的[，,。]?\s*|已为您\s*|以下是\s*|修改后[的：:]\s*|根据您的要求\s*|按照您的要求\s*|这是修改后的\s*|为您修改\s*|我已?经?为您\s*|新[的标题正文]?[：:]?\s*)/i
const aiLabelPattern = /^\s*\*{0,2}(?:标题|内容|正文|修改[后後])[：:。]?\*{0,2}\s*/i

function cleanAIReply(reply) {
  let text = reply.replace(aiPreamblePattern, '')
  while (aiLabelPattern.test(text)) {
    text = text.replace(aiLabelPattern, '')
  }
  return text.trim()
}

function getTargetFromQuestion(question) {
  if (!question) return 'content'
  if (titlePresetActions.some(p => p.action === question)) return 'title'
  // 引用标题作为内容生成依据，而非修改标题本身
  if (/(?:根据|按照|对应|围绕|匹配|结合|对照|配合|基于|从).*标题|标题.*(?:内容|正文|文章|博客|段落)/i.test(question)) return 'content'
  if (/标题|title/i.test(question)) return 'title'
  return 'content'
}

function isModificationRequest(question) {
  if (!question || question.includes('建议')) return false
  const keywords = ['润色', '纠正', '缩短', '扩写', '优化', '修改', '改写', '重写', '生成', '写一篇', '写一个', '写一段', 'polish', 'rewrite', 'correct', 'shorten', 'expand', 'generate']
  return keywords.some(k => question.includes(k))
}

function applyAIContent(content, question) {
  if (!content) return
  const target = getTargetFromQuestion(question)
  if (target === 'title') {
    lastReplacedText.value = { target: 'title', originalContent: form.title }
    form.title = content
  } else {
    lastReplacedText.value = { target: 'content', originalContent: form.content }
    form.content = content
  }
  PxMessage.success('AI 修改已应用')
}

function undoAIResponse() {
  if (!lastReplacedText.value) return
  const { target, originalContent } = lastReplacedText.value
  if (target === 'title') {
    form.title = originalContent
  } else {
    form.content = originalContent
  }
  lastReplacedText.value = null
  PxMessage.success('已撤销 AI 修改')
}

const presetActions = [
  { label: '润色', action: '请润色全文，使其更流畅自然' },
  { label: '纠正语法', action: '请纠正全文中的语法错误和错别字' },
  { label: '缩短', action: '请缩短全文，保持核心信息不变' },
  { label: '扩写', action: '请扩写全文，增加更多细节' },
]

const titlePresetActions = [
  { label: '优化标题', action: '请优化这个标题，使其更吸引人' },
  { label: '缩短标题', action: '请缩短这个标题，保持简洁有力' },
]

async function handleAskAI(question) {
  const q = question || aiQuestion.value.trim()
  if (!q) {
    PxMessage.warning('请输入你的问题')
    return
  }

  if (aiAbortController.value) {
    aiAbortController.value.abort()
  }
  const controller = new AbortController()
  aiAbortController.value = controller

  aiLoading.value = true
  try {
    const result = await askAI(
      form.title || '（无标题）',
      form.content,
      q,
      null,
      controller.signal,
    )
    const reply = result?.response || ''
    if (!reply) {
      PxMessage.warning('AI 未能生成有效回复')
      return
    }
    aiResponse.value = reply
    aiQuestion.value = ''
    if (isModificationRequest(q)) {
      applyAIContent(cleanAIReply(reply), q)
    }
  } catch (err) {
    if (err.name === 'AbortError') return
    aiResponse.value = ''
    PxMessage.error(err.message || 'AI 请求失败')
  } finally {
    aiLoading.value = false
    aiAbortController.value = null
  }
}

function cancelAI() {
  if (aiAbortController.value) {
    aiAbortController.value.abort()
  }
}

function toggleAIPanel() {
  if (aiPanelOpen.value) cancelAI()
  aiPanelOpen.value = !aiPanelOpen.value
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
            ref="titleInputRef"
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
          <div class="editor-toolbar">
            <px-button size="small" plain :loading="uploadingImage" @click="triggerFilePicker">
              <template #prepend>
                <px-icon icon="image-solid" size="14" />
              </template>
              插入图片
            </px-button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display:none"
              @change="handleImageSelected"
            />
          </div>

          <!-- 图片预览区 -->
          <div v-if="uploadedImages.length" class="image-gallery">
            <div v-for="(img, idx) in uploadedImages" :key="img.url" class="image-gallery-item">
              <img :src="img.url" class="image-gallery-preview" @error="$event.target.style.display='none'" />
              <button class="image-gallery-remove" @click="handleDeleteImage(img.url)" title="删除图片">&times;</button>
              <span class="image-gallery-index">{{ idx + 1 }}</span>
            </div>
          </div>

          <px-input
            ref="contentInputRef"
            v-model="form.content"
            type="textarea"
            :rows="20"
            placeholder="在这里编写你的博客内容..."
            resize="vertical"
          />
        </label>
      </div>
    </px-card>

    <!-- AI 写作助手浮窗 -->
    <button class="ai-fab" @click="toggleAIPanel">
      <px-icon icon="magic-solid" size="18" color="#fff" />
      <span class="ai-fab-label">AI 助手</span>
    </button>

    <Teleport to="body">
      <div v-if="aiPanelOpen" class="ai-overlay" @click.self="toggleAIPanel">
        <div class="ai-floating-panel" @click.stop>
          <div class="ai-floating-header">
            <div class="ai-floating-header-left">
              <px-icon icon="magic-solid" size="16" color="#7c4dff" />
              <px-text tag="h2" size="14">AI 写作助手</px-text>
            </div>
            <button class="ai-close-btn" @click="toggleAIPanel">
              <px-icon icon="close-solid" size="14" color="#6b7f87" />
            </button>
          </div>
          <div class="ai-floating-body">
            <div class="ai-presets">
              <px-text size="12" type="secondary" class="ai-presets-label">快速操作：</px-text>
              <button
                v-for="preset in titlePresetActions"
                :key="preset.label"
                class="ai-preset-btn"
                :disabled="aiLoading"
                @click="handleAskAI(preset.action)"
              >
                {{ preset.label }}
              </button>
              <button
                v-for="preset in presetActions"
                :key="preset.label"
                class="ai-preset-btn"
                :disabled="aiLoading"
                @click="handleAskAI(preset.action)"
              >
                {{ preset.label }}
              </button>
            </div>

            <px-input
              v-model="aiQuestion"
              placeholder="输入你的问题，如：帮我润色正文、给个更好的标题"
              clearable
              :disabled="aiLoading"
            />
            <div class="ai-floating-actions">
              <px-button
                v-if="aiLoading"
                size="small"
                :use-throttle="false"
                @click="cancelAI"
              >
                取消
              </px-button>
              <px-button
                v-else
                type="primary"
                size="small"
                :use-throttle="false"
                @click="handleAskAI()"
              >
                提问
              </px-button>
            </div>

            <div v-if="aiLoading" class="ai-loading">
              <px-text size="13" type="secondary">AI 正在思考...</px-text>
            </div>

            <div v-if="aiResponse && !aiLoading" class="ai-response">
              <px-text size="14">{{ aiResponse }}</px-text>
            </div>

            <div v-if="lastReplacedText" class="ai-undo-bar">
              <px-text size="12" type="secondary">
                已修改{{ lastReplacedText.target === 'title' ? '标题' : '正文' }}
              </px-text>
              <button class="ai-undo-btn" @click="undoAIResponse">撤销</button>
            </div>

          </div>
        </div>
      </div>
    </Teleport>
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

.category-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9e2e8;
  border-radius: 8px;
  background: #fff;
  color: #385b66;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.category-select:focus {
  border-color: #7c4dff;
}

/* tag input */

.tag-input-wrapper {
  position: relative;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #d9e2e8;
  border-radius: 8px;
  background: #fff;
  min-height: 40px;
  align-items: center;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  background: #f0f4ff;
  color: #385b66;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}

.tag-remove {
  border: none;
  background: none;
  color: #889ba3;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  line-height: 1;
}

.tag-remove:hover {
  color: #e53935;
}

.tag-input-inline {
  flex: 1;
  min-width: 100px;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 4px;
  color: #385b66;
  background: transparent;
}

.tag-input-inline::placeholder {
  color: #aabcc4;
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #d9e2e8;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 10;
  max-height: 160px;
  overflow-y: auto;
}

.tag-suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #385b66;
}

.tag-suggestion-item:hover {
  background: #f0f4ff;
}

.content-field {
  flex: 1;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  padding: 4px 0;
}

.content-field :deep(.px-textarea) {
  min-height: 400px;
  font-size: 15px;
  line-height: 1.8;
}

.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background: #fafbfc;
  border: 1px solid #e8edf0;
  border-radius: 10px;
  min-height: 0;
}

.image-gallery-item {
  position: relative;
  width: 160px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e5e8;
  background: #fff;
  flex-shrink: 0;
}

.image-gallery-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s ease;
}

.image-gallery-preview:hover {
  transform: scale(1.05);
}

.image-gallery-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-gallery-item:hover .image-gallery-remove {
  opacity: 1;
}

.image-gallery-index {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.ai-fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  height: 44px;
  border-radius: 22px;
  border: none;
  background: linear-gradient(135deg, #7c4dff, #b388ff);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  box-shadow: 0 4px 16px rgba(124, 77, 255, 0.4);
  transition: all 0.25s ease;
  z-index: 100;
}

.ai-fab-label {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.ai-fab:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 24px rgba(124, 77, 255, 0.55);
}

.ai-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.ai-floating-panel {
  position: fixed;
  bottom: 100px;
  right: 32px;
  width: min(520px, 92vw);
  max-height: 75vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.25s ease;
  z-index: 1001;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.ai-floating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(56, 91, 102, 0.1);
}

.ai-floating-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(56, 91, 102, 0.12);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.ai-close-btn:hover {
  background: rgba(56, 91, 102, 0.08);
  border-color: rgba(56, 91, 102, 0.25);
}

.ai-floating-body {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.ai-floating-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ai-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ai-presets-label {
  flex-shrink: 0;
  font-size: 13px;
}

.ai-preset-btn {
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid #d0dde3;
  background: #fff;
  color: #385b66;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-preset-btn:hover:not(:disabled) {
  border-color: #7c4dff;
  color: #7c4dff;
  background: #f8f6ff;
}

.ai-preset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-loading {
  text-align: center;
  padding: 16px;
  color: #999;
}

.ai-undo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  background: #f0fdf4;
  border: 1px solid #d8f0e0;
}

.ai-undo-bar .px-text {
  font-size: 13px;
}

.ai-undo-btn {
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid #86cfa3;
  background: #fff;
  color: #2e7d5a;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
}

.ai-undo-btn:hover {
  background: #e8f8ee;
  border-color: #5cb884;
}

.ai-response {
  background: #f5f3ff;
  border-radius: 10px;
  padding: 16px 18px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
  font-size: 14px;
  color: #2d3e47;
  border: 1px solid #ede7f8;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.03);
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

  .ai-floating-panel {
    right: 12px;
    bottom: 80px;
    width: calc(100vw - 24px);
    max-height: 70vh;
  }

  .ai-floating-body {
    padding: 16px;
  }
}
</style>