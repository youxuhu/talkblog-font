<script setup>
/**
 * 博客编辑页
 * 功能：创建新博客、编辑已有博客
 */

import { onMounted, ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBlogStore } from '@/stores/blog'
import { PxMessage } from '@mmt817/pixel-ui'

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

// 表单数据
const form = reactive({
  title: '',
  content: '',
})

// 计算字数
const titleLength = computed(() => form.title?.length || 0)
const contentLength = computed(() => form.content?.length || 0)
const contentRemaining = computed(() => 10000 - contentLength.value)

// 组件挂载时加载博客数据
onMounted(async () => {
  if (isEditMode.value) {
    isLoading.value = true
    try {
      const blog = await blogStore.fetchBlogDetail(blogId.value)
      if (blog) {
        form.title = blog.title || ''
        form.content = blog.content || ''
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
    }
  } else {
    form.title = ''
    form.content = ''
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
          <px-input
            v-model="form.content"
            type="textarea"
            :rows="20"
            placeholder="在这里编写你的博客内容..."
            resize="vertical"
          />
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