<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PxMessage } from '@mmt817/pixel-ui'
import { loginByFace, registerByFace, saveLoginSession } from '@/services/auth'

const router = useRouter()

const activeMode = ref('login')
const loading = ref(false)
const cameraLoading = ref(false)
const cameraError = ref('')
const videoRef = ref(null)
const canvasRef = ref(null)
const streamRef = ref(null)
const snapshot = ref('')

const loginForm = reactive({
  email: '',
})

const registerForm = reactive({
  email: '',
  username: '',
  password: '',
})

const isLogin = computed(() => activeMode.value === 'login')
const currentEmail = computed({
  get() {
    return isLogin.value ? loginForm.email : registerForm.email
  },
  set(value) {
    if (isLogin.value) {
      loginForm.email = value
      return
    }

    registerForm.email = value
  },
})
const panelTitle = computed(() => (isLogin.value ? 'Face Login' : 'Face Register'))
const panelDescription = computed(() => (
  isLogin.value
    ? '输入邮箱并拍照，系统将根据你的人脸完成登录。'
    : '填写基础信息并采集一张清晰正脸照片，系统会完成像素档案注册。'
))

watch(activeMode, () => {
  snapshot.value = ''
})

onMounted(() => {
  startCamera()
})

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
  const form = isLogin.value ? loginForm : registerForm

  if (!validateEmail(form.email)) {
    PxMessage.warning('请输入正确的邮箱地址')
    return false
  }

  if (!snapshot.value) {
    PxMessage.warning('请先拍摄人脸照片')
    return false
  }

  if (!isLogin.value) {
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
    if (isLogin.value) {
      const result = await loginByFace({
        email: loginForm.email.trim(),
        image: snapshot.value,
      })

      if (!result?.success) {
        throw new Error(result?.message || '登录失败')
      }

      saveLoginSession(loginForm.email.trim())
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

    if (!result?.success) {
      throw new Error(result?.message || '注册失败')
    }

    PxMessage.success(result.message || '注册成功')
    activeMode.value = 'login'
    loginForm.email = registerForm.email.trim()
    registerForm.username = ''
    registerForm.password = ''
  } catch (error) {
    PxMessage.error(error?.message || '操作失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <px-text tag="p" size="12">TalkBlog Face Portal</px-text>
        <h1 class="hero-title">像素人脸门禁</h1>
        <p class="hero-subtitle">
          使用浏览器摄像头采集头像，直接对接 `API_APIFOX` 文档里的注册与登录接口。
        </p>
      </div>

      <px-card round hoverable class="camera-card">
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
          <video ref="videoRef" class="camera-video" autoplay playsinline muted />
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
    </section>

    <section class="form-panel">
      <px-card stamp class="form-card">
        <template #prepend>
          <px-icon :icon="isLogin ? 'user-solid' : 'id-card-solid'" size="28" color="#7c4dff" />
        </template>
        <template #header>
          <div class="card-title-row">
            <px-text tag="h2" size="16">{{ panelTitle }}</px-text>
            <px-text size="12">{{ panelDescription }}</px-text>
          </div>
        </template>

        <div class="mode-switch">
          <px-button
            :type="isLogin ? 'primary' : 'base'"
            :plain="!isLogin"
            :use-throttle="false"
            @click="activeMode = 'login'"
          >
            登录
          </px-button>
          <px-button
            :type="!isLogin ? 'sakura' : 'base'"
            :plain="isLogin"
            :use-throttle="false"
            @click="activeMode = 'register'"
          >
            注册
          </px-button>
        </div>

        <div class="form-fields">
          <label class="field-block">
            <span class="field-label">邮箱</span>
            <px-input v-model="currentEmail" placeholder="user@example.com" clearable />
          </label>

          <template v-if="!isLogin">
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
        </div>

        <template #footer>
          <div class="submit-row">
            <px-button type="primary" :loading="loading" :use-throttle="false" @click="submitForm">
              {{ isLogin ? '人脸登录' : '注册账号' }}
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
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 440px);
  gap: 24px;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(247, 244, 239, 0.82), rgba(224, 235, 247, 0.82)),
    radial-gradient(circle at top left, #f9d8d6 0, transparent 28%),
    radial-gradient(circle at bottom right, #c7f0d8 0, transparent 24%),
    #ebe6e0;
}

.hero-panel,
.form-panel {
  min-width: 0;
}

.hero-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 4px;
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

.card-title-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.camera-stage {
  position: relative;
  overflow: hidden;
  min-height: 320px;
  border: 3px solid #385b66;
  background:
    linear-gradient(135deg, rgba(56, 91, 102, 0.08), rgba(124, 77, 255, 0.08)),
    #dce9ef;
}

.camera-video,
.camera-preview {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 320px;
  object-fit: cover;
}

.camera-mask {
  position: absolute;
  inset: auto 16px 16px 16px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px dashed #385b66;
  color: #385b66;
  font-size: 12px;
  line-height: 1.6;
}

.camera-error {
  display: inline-block;
  margin-top: 12px;
  color: #c53030;
}

.camera-actions,
.mode-switch,
.submit-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.form-panel {
  display: flex;
  align-items: center;
}

.form-fields {
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
  font-size: 12px;
  color: #385b66;
}

.snapshot-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 2px dashed #7c4dff;
  background: rgba(255, 255, 255, 0.65);
}

.hidden-canvas {
  display: none;
}

@media (max-width: 960px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .form-panel {
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .auth-page {
    padding: 16px;
    gap: 16px;
  }

  .camera-stage,
  .camera-video,
  .camera-preview {
    min-height: 260px;
  }
}
</style>
