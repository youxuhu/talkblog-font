<script setup>
import { onMounted, ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import { PxMessage } from '@mmt817/pixel-ui'

const route = useRoute()
const router = useRouter()
const seriesStore = useSeriesStore()

const seriesId = computed(() => route.params.id)
const isEditMode = computed(() => !!seriesId.value)
const isLoading = ref(false)
const isSaving = ref(false)

const form = reactive({
  name: '',
  description: '',
})

onMounted(async () => {
  if (isEditMode.value) {
    isLoading.value = true
    try {
      const series = await seriesStore.fetchSeriesDetail(seriesId.value)
      if (series) {
        form.name = series.name || ''
        form.description = series.description || ''
      }
    } catch (err) {
      PxMessage.error(err.message || '加载专栏失败')
    } finally {
      isLoading.value = false
    }
  }
})

function goBack() {
  if (isEditMode.value) {
    router.push(`/series/${seriesId.value}`)
  } else {
    router.push('/series')
  }
}

async function handleSubmit() {
  if (!form.name.trim()) {
    PxMessage.warning('请输入专栏名称')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
    }

    if (isEditMode.value) {
      await seriesStore.updateSeries(seriesId.value, payload)
      PxMessage.success('专栏更新成功')
      router.push(`/series/${seriesId.value}`)
    } else {
      const result = await seriesStore.createSeries(payload)
      PxMessage.success('专栏创建成功')
      router.push(`/series/${result.data?.id || ''}`)
    }
  } catch (err) {
    PxMessage.error(err.message || '操作失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}

function handleReset() {
  if (isEditMode.value && seriesStore.currentSeries) {
    form.name = seriesStore.currentSeries.name || ''
    form.description = seriesStore.currentSeries.description || ''
  } else {
    form.name = ''
    form.description = ''
  }
}
</script>

<template>
  <main class="series-editor-page">
    <section class="page-header">
      <div class="header-left">
        <px-button plain @click="goBack">
          <template #prepend>
            <px-icon icon="arrow-left-solid" size="16" />
          </template>
          返回
        </px-button>
        <px-text tag="h1" size="18">{{ isEditMode ? '编辑专栏' : '创建专栏' }}</px-text>
      </div>
      <div class="header-actions">
        <px-button plain @click="handleReset">重置</px-button>
        <px-button type="primary" :loading="isSaving" @click="handleSubmit">
          <template #prepend>
            <px-icon icon="check-solid" size="16" />
          </template>
          {{ isEditMode ? '保存修改' : '创建' }}
        </px-button>
      </div>
    </section>

    <px-card class="editor-card" v-loading="isLoading">
      <div class="editor-form">
        <label class="form-field">
          <div class="field-header">
            <span class="field-label">专栏名称</span>
            <px-text size="12" type="secondary">{{ form.name.length }}/50</px-text>
          </div>
          <px-input
            v-model="form.name"
            placeholder="输入专栏名称"
            size="large"
            clearable
            maxlength="50"
          />
        </label>

        <label class="form-field">
          <div class="field-header">
            <span class="field-label">专栏描述</span>
            <px-text size="12" type="secondary">{{ form.description.length }}/200</px-text>
          </div>
          <px-input
            v-model="form.description"
            type="textarea"
            :rows="6"
            placeholder="描述这个专栏的主题和内容..."
            maxlength="200"
            resize="vertical"
          />
        </label>
      </div>
    </px-card>
  </main>
</template>

<style scoped>
.series-editor-page {
  min-height: 100vh;
  padding: 24px;
  max-width: 700px;
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

@media (max-width: 640px) {
  .series-editor-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
