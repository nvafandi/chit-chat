import { create } from 'zustand'
import type { User } from '@/types'
import {
  loginWithProvider,
  completeRedirectLogin,
  logoutFirebase,
  waitForAuth,
  type SocialProvider,
} from '@/services/authService'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (provider: SocialProvider) => Promise<boolean>
  restoreSession: () => Promise<boolean>
  logout: () => Promise<void>
  setError: (msg: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  async login(provider) {
    set({ isLoading: true, error: null })
    try {
      const result = await loginWithProvider(provider)
      if (result.redirected) {
        // Full-page redirect will reload the app; keep spinner up.
        return false
      }
      if (!result.ok || !result.user) {
        set({ isLoading: false, error: null })
        return false
      }
      set({ user: result.user, isLoading: false })
      return true
    } catch (err) {
      const code = (err as { code?: string }).code
      let msg = err instanceof Error ? err.message : 'Login gagal'
      if (code === 'auth/popup-closed-by-request' || code === 'auth/user-cancelled') {
        msg = ''
      } else if (code === 'auth/unauthorized-domain') {
        msg = 'Domain belum diizinkan di Firebase Console → Authentication → Settings → Authorized domains'
      } else if (code === 'auth/operation-not-allowed') {
        msg = 'Provider belum diaktifkan di Firebase Console → Authentication → Sign-in method'
      }
      set({ error: msg || null, isLoading: false })
      return false
    }
  },

  async restoreSession() {
    set({ isLoading: true })
    try {
      // Complete a redirect-based login first (no-op after popup logins)
      let profile = await completeRedirectLogin()
      if (!profile) {
        const fu = await waitForAuth()
        if (!fu) {
          set({ isLoading: false })
          return false
        }
        const { getUserById } = await import('@/services/firebase')
        profile = await getUserById(fu.uid)
      }
      if (profile) {
        set({ user: profile, isLoading: false })
        return true
      }
      set({ isLoading: false })
      return false
    } catch {
      set({ isLoading: false })
      return false
    }
  },

  async logout() {
    await logoutFirebase()
    set({ user: null })
  },

  setError: (msg) => set({ error: msg }),
}))
