import { getSession, saveSession, clearSession } from '@/services/session'
import type { User } from '@/types'
import { useSyncExternalStore } from 'react'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

const listeners = new Set<() => void>()
let state: AuthState = {
  user: null,
  isLoading: false,
  error: null
}

function emit() {
  listeners.forEach(l => l())
}

export const authStore = {
  getState() {
    return state
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  initializeAuth() {
    const session = getSession()
    if (session) {
      state = {
        ...state,
        user: {
          id: session.userId,
          username: session.username,
          password: session.password,
          animal: session.animal,
          createdAt: Date.now(),
        }
      }
      emit()
    }
  },
  setUser(userData: User) {
    state = { ...state, user: userData }
    emit()
    saveSession({
      username: userData.username,
      userId: userData.id,
      animal: userData.animal,
      password: userData.password,
    })
  },
  logout() {
    state = { ...state, user: null }
    emit()
    clearSession()
  },
  setLoading(loading: boolean) {
    state = { ...state, isLoading: loading }
    emit()
  },
  setError(err: string | null) {
    state = { ...state, error: err }
    emit()
  },
  clearError() {
    state = { ...state, error: null }
    emit()
  },
  isAuthenticated() {
    return state.user !== null
  }
}

export function useAuthStore() {
  const currentState = useSyncExternalStore(authStore.subscribe, authStore.getState)
  return {
    ...currentState,
    initializeAuth: authStore.initializeAuth,
    setUser: authStore.setUser,
    logout: authStore.logout,
    setLoading: authStore.setLoading,
    setError: authStore.setError,
    clearError: authStore.clearError,
    isAuthenticated: authStore.isAuthenticated,
  }
}
