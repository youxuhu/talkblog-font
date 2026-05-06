/**
 * 路由配置文件
 * 定义页面跳转规则和访问权限
 */

import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { isAdminUser, isAuthenticated } from '@/services/auth'

// 导入页面组件
import HomeView from '../views/HomeView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import BlogListView from '../views/BlogListView.vue'
import BlogDetailView from '../views/BlogDetailView.vue'
import BlogEditorView from '../views/BlogEditorView.vue'

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  
  // 路由规则配置
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/welcome', name: 'welcome', component: WelcomeView, meta: { requiresAuth: true } },
    { path: '/admin/users', name: 'admin-users', component: AdminUsersView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/blogs', name: 'blog-list', component: BlogListView },
    { path: '/blog/:id', name: 'blog-detail', component: BlogDetailView },
    { path: '/blog/editor/:id?', name: 'blog-editor', component: BlogEditorView, meta: { requiresAuth: true } },
  ],
})

// 路由守卫
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