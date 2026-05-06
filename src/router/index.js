import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { isAdminUser, isAuthenticated } from '@/services/auth'
import HomeView from '../views/HomeView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import ChatView from '../views/ChatView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import AdminChatView from '../views/AdminChatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: WelcomeView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatView,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/admin/chat',
      name: 'admin-chat',
      component: AdminChatView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    ElMessage.warning('请先登录')
    return '/'
  }

  if (to.meta.requiresAdmin && !isAdminUser()) {
    ElMessage.warning('需要管理员权限')
    return '/welcome'
  }

  if (to.path === '/' && isAuthenticated()) {
    return '/welcome'
  }

  return true
})

export default router
