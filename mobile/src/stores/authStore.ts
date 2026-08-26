import { create } from 'zustand'
import type { User, SessionData } from '@/types'
import { loginUser, registerUser } from '@/services/firebase'
import { saveSession, getSession, clearSession } from '@/services/session'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, password: string) => Promise<boolean>
  restoreSession: () => Promise<boolean>
  logout: () => Promise<void>
  setError: (msg: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  async login(username, password) {
    set({ isLoading: true, error: null })
    try {
      const user = await loginUser(username.trim(), password)
      await saveSession({
        username: user.username,
        userId: user.id,
        animal: user.animal,
        password,
      })
      set({ user, isLoading: false })
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login gagal', isLoading: false })
      return false
    }
  },

  async register(username, password) {
    set({ isLoading: true, error: null })
    try {
      const user = await registerUser(username.trim(), password)
      await saveSession({
        username: user.username,
        userId: user.id,
        animal: user.animal,
        password,
      })
      set({ user, isLoading: false })
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Registrasi gagal', isLoading: false })
      return false
    }
  },

  async restoreSession() {
    const session: SessionData | null = await getSession()
    if (!session) return false
    try {
      set({ isLoading: true })
      const { getUserById } = await import('@/services/firebase')
      const user = await getUserById(session.userId)
      if (user) {
        set({ user, isLoading: false })
        return true
      }
      await clearSession()
      set({ isLoading: false })
      return false
    } catch {
      set({ isLoading: false })
      return false
    }
  },

  async logout() {
    await clearSession()
    set({ user: null })
  },

  setError: (msg) => set({ error: msg }),
}))
