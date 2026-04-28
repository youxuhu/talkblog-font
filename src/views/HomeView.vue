<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PxMessage } from '@mmt817/pixel-ui'
import { loginByFace, loginByPassword, registerByFace, saveAuthState } from '@/services/auth'

const router = useRouter()

const currentMode = ref('face-login')
const loading = ref(false)
const cameraLoading = ref(false)
const cameraError = ref('')
const videoRef = ref(null)
const canvasRef = ref(null)
const streamRef = ref(null)
const snapshot = ref('')

const faceLoginForm = reactive({
  email: '',
})

const passwordLoginForm = reactive({
  email: '',
  password: '',
})

const registerForm = reactive({
  email: '',
  username: '',
  password: '',
})

const modeOptions = [
  { value: 'face-login', label: '人脸登录' },
  { value: 'password-login', label: '密码登录' },
  { value: 'face-register', label: '人脸注册' },
]

const modeMeta = computed(() => {
  if (currentMode.value === 'password-login') {
    return {
      title: '密码登录',
      description: '输入邮箱和密码即可完成登录，不需要摄像头。',
      actionText: '登录',
      showCamera: false,
    }
  }

  if (currentMode.value === 'face-register') {
    return {
      title: '人脸注册',
      description: '录入邮箱、用户名、密码，并拍摄正脸照片完成注册。',
      actionText: '注册',
      showCamera: true,
    }
  }

  return {
    title: '人脸登录',
    description: '输入邮箱并拍摄当前人脸，即可完成快速登录。',
    actionText: '登录',
    showCamera: true,
  }
})

watch(
  currentMode,
  async () => {
    snapshot.value = ''

    if (modeMeta.value.showCamera) {
      await startCamera()
      return
    }

    stopCamera()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopCamera()
})

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = '当前浏览器不支持摄像头调用。'
    return
  }

  cameraLoading.value = true
  cameraError.value = ''

  try {
    stopCamera()
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })

    streamRef.value = stream

    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
  } catch (error) {
    cameraError.value = getCameraErrorMessage(error)
  } finally {
    cameraLoading.value = false
  }
}

function stopCamera() {
  if (!streamRef.value) {
    return
  }

  streamRef.value.getTracks().forEach((track) => track.stop())
  streamRef.value = null
}

function getCameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError') {
    return '摄像头权限被拒绝，请允许浏览器访问摄像头。'
  }

  if (error?.name === 'NotFoundError') {
    return '未检测到可用摄像头设备。'
  }

  if (error?.name === 'NotReadableError') {
    return '摄像头正被其他应用占用，请关闭后重试。'
  }

  return '摄像头启动失败，请检查浏览器权限和设备状态。'
}

function captureFace() {
  if (!videoRef.value || !canvasRef.value) {
    PxMessage.warning('摄像头尚未准备完成')
    return
  }

  const video = videoRef.value
  const canvas = canvasRef.value

  if (!video.videoWidth || !video.videoHeight) {
    PxMessage.warning('暂时无法截图，请稍后再试')
    return
  }

  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const context = canvas.getContext('2d')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  snapshot.value = canvas.toDataURL('image/jpeg', 0.92)
  PxMessage.success('已捕获当前人脸画面')
}

function resetSnapshot() {
  snapshot.value = ''
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateCurrentForm() {
  if (currentMode.value === 'password-login') {
    if (!validateEmail(passwordLoginForm.email)) {
      PxMessage.warning('请输入正确的邮箱地址')
      return false
    }

    if (!passwordLoginForm.password.trim()) {
      PxMessage.warning('请输入密码')
      return false
    }

    return true
  }

  const form = currentMode.value === 'face-login' ? faceLoginForm : registerForm

  if (!validateEmail(form.email)) {
    PxMessage.warning('请输入正确的邮箱地址')
    return false
  }

  if (!snapshot.value) {
    PxMessage.warning('请先拍摄人脸照片')
    return false
  }

  if (currentMode.value === 'face-register') {
    if (!registerForm.username.trim()) {
      PxMessage.warning('请输入用户名')
      return false
    }

    if (!registerForm.password.trim()) {
      PxMessage.warning('请输入密码')
      return false
    }
  }

  return true
}

async function submitForm() {
  if (!validateCurrentForm()) {
    return
  }

  loading.value = true

  try {
    if (currentMode.value === 'password-login') {
      const result = await loginByPassword({
        email: passwordLoginForm.email.trim(),
        password: passwordLoginForm.password,
      })

      saveAuthState(result.data)
      PxMessage.success(result.message || '登录成功')
      router.push('/welcome')
      return
    }

    if (currentMode.value === 'face-login') {
      const result = await loginByFace({
        email: faceLoginForm.email.trim(),
        image: snapshot.value,
      })

      saveAuthState(result.data)
      PxMessage.success(result.message || '登录成功')
      router.push('/welcome')
      return
    }

    const result = await registerByFace({
      email: registerForm.email.trim(),
      username: registerForm.username.trim(),
      password: registerForm.password,
      image: snapshot.value,
    })

    PxMessage.success(result.message || '注册成功')
    currentMode.value = 'face-login'
    faceLoginForm.email = registerForm.email.trim()
    passwordLoginForm.email = registerForm.email.trim()
    registerForm.username = ''
    registerForm.password = ''
  } catch (error) {
    PxMessage.error(error?.message || '操作失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function fillSamplePassword() {
  passwordLoginForm.email = faceLoginForm.email || registerForm.email || ''
}
</script>

<template>
  <main :class="['auth-page', { 'no-camera': !modeMeta.showCamera }]">
    <section class="hero-panel">
      <div class="hero-copy">
        <px-text tag="p" size="12">TalkBlog Access Portal</px-text>
        <h1 class="hero-title">像素门禁</h1>
        <p class="hero-subtitle">
          现在支持人脸登录、密码登录和人脸注册，登录后可直接进入后台用户管理页面。
        </p>
      </div>

      <px-card v-if="modeMeta.showCamera" round hoverable class="camera-card">
        <template #prepend>
          <px-icon icon="camera-solid" size="26" color="#385b66" />
        </template>
        <template #header>
          <div class="card-title-row">
            <px-text tag="h2" size="16">Face Capture</px-text>
            <px-text size="12">请正对镜头，保持光线充足</px-text>
          </div>
        </template>

        <div class="camera-stage" v-loading.grid="cameraLoading" px-loading-text="正在连接摄像头...">
          <video ref="videoRef" class="camera-video" autoplay playsinline muted></video>
          <div v-if="!snapshot" class="camera-mask">准备好后点击拍照，系统会上传当前画面。</div>
          <img v-else :src="snapshot" alt="face snapshot" class="camera-preview" />
        </div>

        <px-text v-if="cameraError" size="12" class="camera-error">{{ cameraError }}</px-text>

        <template #footer>
          <div class="camera-actions">
            <px-button type="primary" :use-throttle="false" @click="captureFace">拍照</px-button>
            <px-button plain :use-throttle="false" @click="resetSnapshot">重拍</px-button>
            <px-button plain :use-throttle="false" @click="startCamera">重连摄像头</px-button>
          </div>
        </template>
      </px-card>

      <px-card v-else stamp class="camera-card camera-placeholder">
        <template #prepend>
          <px-icon icon="lock-solid" size="26" color="#385b66" />
        </template>
        <template #header>
          <div class="card-title-row">
            <px-text tag="h2" size="16">Camera not required</px-text>
            <px-text size="12">密码登录不需要摄像头</px-text>
          </div>
        </template>

        <p class="placeholder-copy">
          切到密码登录后，页面会只保留邮箱和密码输入，不会再请求摄像头权限。
        </p>
      </px-card>
    </section>

    <section class="form-panel">
      <px-card stamp class="form-card">
        <template #prepend>
          <px-icon :icon="currentMode === 'face-register' ? 'id-card-solid' : 'user-solid'" size="28" color="#7c4dff" />
        </template>
        <template #header>
          <div class="card-title-row">
            <px-text tag="h2" size="16">{{ modeMeta.title }}</px-text>
            <px-text size="12">{{ modeMeta.description }}</px-text>
          </div>
        </template>

        <div class="mode-switch">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            class="mode-button"
            :class="{ active: currentMode === option.value }"
            type="button"
            @click="currentMode = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="form-fields">
          <template v-if="currentMode === 'password-login'">
            <label class="field-block">
              <span class="field-label">邮箱</span>
              <px-input v-model="passwordLoginForm.email" placeholder="user@example.com" clearable />
            </label>

            <label class="field-block">
              <span class="field-label">密码</span>
              <px-input v-model="passwordLoginForm.password" type="password" placeholder="输入登录密码" show-password />
            </label>

            <div class="snapshot-info">
              <px-icon icon="lock-solid" size="18" color="#805ad5" />
              <px-text size="12">密码登录无需拍照，可直接提交。</px-text>
            </div>
          </template>

          <template v-else>
            <label class="field-block">
              <span class="field-label">邮箱</span>
              <px-input v-model="faceLoginForm.email" placeholder="user@example.com" clearable />
            </label>

            <template v-if="currentMode === 'face-register'">
              <label class="field-block">
                <span class="field-label">用户名</span>
                <px-input v-model="registerForm.username" placeholder="输入你的昵称" clearable />
              </label>

              <label class="field-block">
                <span class="field-label">密码</span>
                <px-input v-model="registerForm.password" type="password" placeholder="设置登录密码" show-password />
              </label>
            </template>

            <div class="snapshot-info">
              <px-icon :icon="snapshot ? 'check-solid' : 'camera-solid'" size="18" :color="snapshot ? '#2f855a' : '#805ad5'" />
              <px-text size="12">{{ snapshot ? '已采集到人脸照片，可直接提交。' : '请先完成拍照，再进行提交。' }}</px-text>
            </div>
          </template>
        </div>

        <template #footer>
          <div class="submit-row">
            <px-button type="primary" :loading="loading" :use-throttle="false" @click="submitForm">
              {{ modeMeta.actionText }}
            </px-button>
            <px-button v-if="currentMode === 'password-login'" plain :use-throttle="false" @click="fillSamplePassword">
              复用邮箱
            </px-button>
          </div>
        </template>
      </px-card>
    </section>

    <canvas ref="canvasRef" class="hidden-canvas" />
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
  gap: 24px;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(247, 244, 239, 0.82), rgba(224, 235, 247, 0.82)),
    radial-gradient(circle at top left, #f9d8d6 0, transparent 28%),
    radial-gradient(circle at bottom right, #c7f0d8 0, transparent 24%),
    #ebe6e0;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
}

.hero-panel,
.form-panel {
  min-width: 0;
}

.hero-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  justify-content: center;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 4px;
}

.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4.4rem);
  line-height: 1.05;
  color: #213547;
}

.hero-subtitle {
  max-width: 680px;
  margin: 0;
  color: #385b66;
  line-height: 1.7;
}

.camera-card,
.form-card {
  width: 100%;
}

.camera-placeholder {
  min-height: 240px;
}

.placeholder-copy {
  margin: 0;
  line-height: 1.8;
  color: #385b66;
}

.card-title-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.camera-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16/9;
  min-height: 280px;
  max-height: 420px;
  width: 100%;
  border: none;
  outline: var(--camera-border, 2px) solid #385b66;
  background:
    linear-gradient(135deg, rgba(56, 91, 102, 0.08), rgba(124, 77, 255, 0.08)),
    #dce9ef;
  box-sizing: border-box;
  padding: 0;
}

.camera-video,
.camera-preview,
.camera-mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.camera-video,
.camera-preview {
  object-fit: contain;
  object-position: center;
  display: block;
}

.auth-page.no-camera {
  grid-template-columns: 1fr;
}

.auth-page.no-camera .form-panel {
  max-width: 720px;
  margin: 0 auto;
}

.auth-page.no-camera .hero-panel {
  display: none;
}

.camera-mask {
  display: grid;
  place-items: center;
  padding: 24px;
  color: #385b66;
  text-align: center;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.18));
  backdrop-filter: blur(4px);
}

.camera-error {
  color: #b83280;
}

.camera-actions,
.submit-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.mode-button {
  padding: 12px 14px;
  border: 2px solid rgba(56, 91, 102, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  color: #385b66;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.mode-button:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 91, 102, 0.45);
}

.mode-button.active {
  border-color: #7c4dff;
  color: #5d3ef0;
  background: rgba(124, 77, 255, 0.12);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: #385b66;
  font-size: 0.92rem;
  font-weight: 700;
}

.snapshot-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(56, 91, 102, 0.12);
  color: #385b66;
}

.hidden-canvas {
  display: none;
}

@media (max-width: 1024px) {
  .auth-page {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .auth-page {
    padding: 16px;
    gap: 16px;
  }

  .mode-switch {
    grid-template-columns: 1fr;
  }
}
</style>
