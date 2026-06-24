<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import NotificationBell from '@/components/NotificationBell.vue'
import { isAuthenticated } from '@/services/auth'

const router = useRouter()
const transitionName = ref('fade')
const showNav = computed(() => {
  const path = router.currentRoute.value.path
  return path !== '/' && path !== '/welcome'
})

watch(
  () => router.currentRoute.value,
  (to, from) => {
    if (!from) {
      transitionName.value = 'fade'
      return
    }
    const toDepth = to.meta.depth ?? 0
    const fromDepth = from.meta.depth ?? 0
    transitionName.value = toDepth > fromDepth ? 'slide-left' : 'slide-right'
  },
)
</script>

<template>
  <div class="app-shell">
    <nav v-if="showNav" class="top-nav">
      <div class="nav-left">
        <router-link to="/blogs" class="nav-link">博客</router-link>
        <router-link to="/series" class="nav-link">专栏</router-link>
        <router-link to="/chat" class="nav-link">聊天室</router-link>
      </div>
      <div class="nav-right">
        <NotificationBell />
      </div>
    </nav>
    <router-view v-slot="{ Component, route }">
      <transition :name="transitionName" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
  </div>
</template>

<style>
.app-shell {
  min-height: 100vh;
  background: #ebe6e0;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 52px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(56, 91, 102, 0.12);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.nav-left {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7f87;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  background: rgba(56, 91, 102, 0.08);
  color: #5d3ef0;
}

.nav-link.router-link-active {
  color: #5d3ef0;
  background: rgba(93, 62, 240, 0.08);
}

.nav-right {
  display: flex;
  align-items: center;
}

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}
.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
