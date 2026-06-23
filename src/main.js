import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 添加Element Plus UI库的引入
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
// 添加Pixel UI库的引入
import PixelUI from '@mmt817/pixel-ui'
import '@mmt817/pixel-ui/dist/index.css'

import './styles/theme.css'

// 初始化主题
import { useThemeStore } from '@/stores/theme'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})
app.use(PixelUI)

// 在挂载前确保主题生效
useThemeStore()

app.mount('#app')