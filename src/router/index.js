import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { isAdminUser, isAuthenticated } from '@/services/auth'
import PortalView from '../views/PortalView.vue'
import HomeView from '../views/HomeView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import ProfileView from '../views/ProfileView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import BlogListView from '../views/BlogListView.vue'
import BlogDetailView from '../views/BlogDetailView.vue'
import BlogEditorView from '../views/BlogEditorView.vue'
import BlogVersionsView from '../views/BlogVersionsView.vue'
import BookmarksView from '../views/BookmarksView.vue'
import NotificationListView from '../views/NotificationListView.vue'
import SeriesListView from '../views/SeriesListView.vue'
import SeriesDetailView from '../views/SeriesDetailView.vue'
import SeriesEditorView from '../views/SeriesEditorView.vue'
import AdminCommentsView from '../views/AdminCommentsView.vue'
import AdminCommentStatsView from '../views/AdminCommentStatsView.vue'
import AdminReportsView from '../views/AdminReportsView.vue'
import ChatView from '../views/ChatView.vue'
import AdminChatView from '../views/AdminChatView.vue'
import ChatroomAdminView from '../views/ChatroomAdminView.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: PortalView,
      meta: { depth: 0 },
    },
    {
      path: '/login',
      name: 'login',
      component: HomeView,
      meta: { depth: 0 },
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: WelcomeView,
      meta: {
        depth: 1,
        requiresAuth: true,
      },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: {
        depth: 0,
        requiresAuth: true,
      },
    },
    {
      path: '/blogs/:id',
      redirect: to => ({ path: `/blog/${to.params.id}` }),
    },
    {
      path: '/blogs',
      name: 'blog-list',
      component: BlogListView,
      meta: { depth: 1 },
    },
    {
      path: '/blog/editor/:id?',
      name: 'blog-editor',
      component: BlogEditorView,
      meta: {
        depth: 2,
        requiresAuth: true,
      },
    },
    {
      path: '/blog/:id',
      name: 'blog-detail',
      component: BlogDetailView,
      meta: { depth: 2 },
    },
    {
      path: '/blog/:id/versions',
      name: 'blog-versions',
      component: BlogVersionsView,
      meta: { depth: 3 },
    },
    {
      path: '/series',
      name: 'series-list',
      component: SeriesListView,
      meta: { depth: 1 },
    },
    {
      path: '/series/editor/:id?',
      name: 'series-editor',
      component: SeriesEditorView,
      meta: {
        depth: 2,
        requiresAuth: true,
      },
    },
    {
      path: '/series/:id',
      name: 'series-detail',
      component: SeriesDetailView,
      meta: { depth: 2 },
    },
    {
      path: '/bookmarks',
      name: 'bookmarks',
      component: BookmarksView,
      meta: { depth: 2, requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationListView,
      meta: { depth: 2, requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: {
        depth: 1,
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/admin/comments',
      name: 'admin-comments',
      component: AdminCommentsView,
      meta: {
        depth: 1,
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/admin/comments/stats',
      name: 'admin-comment-stats',
      component: AdminCommentStatsView,
      meta: {
        depth: 2,
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/admin/comments/reports',
      name: 'admin-comment-reports',
      component: AdminReportsView,
      meta: {
        depth: 2,
        requiresAuth: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatView,
      meta: { depth: 1, requiresAuth: true },
    },
    {
      path: '/chat/:id',
      name: 'chat-room',
      component: ChatView,
      meta: { depth: 2, requiresAuth: true },
    },
    {
      path: '/admin/chat',
      name: 'admin-chat',
      component: AdminChatView,
      meta: { depth: 1, requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/chatrooms',
      name: 'admin-chatrooms',
      component: ChatroomAdminView,
      meta: { depth: 1, requiresAuth: true, requiresAdmin: true },
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

  if ((to.path === '/' || to.path === '/login') && isAuthenticated()) {
    return '/welcome'
  }

  return true
})

export default router
