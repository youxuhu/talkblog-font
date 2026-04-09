import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 添加Element Plus UI库的引入
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
// 添加Pixel UI库的引入
import PixelUI from '@mmt817/pixel-ui'
import '@mmt817/pixel-ui/dist/index.css'


const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})
app.use(PixelUI)

app.mount('#app')