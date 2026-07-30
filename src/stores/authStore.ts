import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types'
import { getSession, saveSession, clearSession } from '@/services/session'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Initialize from session
  function initializeAuth() {
    const session = getSession()
    if (session) {
      user.value = {
        id: session.userId,
        username: session.username,
        password: session.password, // Load password from session cookie
        animal: session.animal,
        createdAt: Date.now(),
      }
    }
  }

  function setUser(userData: User) {
    user.value = userData
    saveSession({
      username: userData.username,
      userId: userData.id,
      animal: userData.animal,
      password: userData.password, // Include password in session
    })
  }

  function logout() {
    user.value = null
    clearSession()
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  function setError(err: string | null) {
    error.value = err
  }

  function clearError() {
    error.value = null
  }

  const isAuthenticated = () => user.value !== null

  return {
    user,
    isLoading,
    error,
    initializeAuth,
    setUser,
    logout,
    setLoading,
    setError,
    clearError,
    isAuthenticated,
  }
})
