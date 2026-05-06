import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { isAdminUser, isAuthenticated } from '@/services/auth'
import HomeView from '../views/HomeView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import BlogCommentView from '../views/BlogCommentView.vue'
import AdminCommentsView from '../views/AdminCommentsView.vue'
import AdminCommentStatsView from '../views/AdminCommentStatsView.vue'

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
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/blog/:blogId/comments',
      name: 'blog-comments',
      component: BlogCommentView,
    },
    {
      path: '/admin/comments',
      name: 'admin-comments',
      component: AdminCommentsView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/admin/comments/stats',
      name: 'admin-comment-stats',
      component: AdminCommentStatsView,
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
