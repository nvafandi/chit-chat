import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { validateSession } from '@/services/session'
import { clearAllStorage } from '@/services/storageCleanup'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat',
  },
  {
    path: '/create-account',
    name: 'CreateAccount',
    component: () => import('@/views/CreateAccount.vue'),
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  authStore.initializeAuth()

  // If route requires auth, validate session
  if (to.meta.requiresAuth) {
    // Check if session is still valid (not expired)
    if (!validateSession()) {
      // Session expired or invalid - clear all storage silently
      console.warn('[Router] Session expired.')
      clearAllStorage()
      // Redirect to create account
      next('/create-account')
      return
    }
  }

  const requiresAuth = to.meta.requiresAuth
  const isAuthenticated = authStore.isAuthenticated()

  if (requiresAuth && !isAuthenticated) {
    // Redirect to create account if not authenticated
    next('/create-account')
  } else if (to.path === '/create-account' && isAuthenticated) {
    // Redirect to chat if already authenticated
    next('/chat')
  } else {
    next()
  }
})

export default router
