import { deleteAllCookies } from './cookieService'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { APP_VERSION_KEY, APP_VERSION } from '@/utils/const'

/**
 * Save application version to localStorage
 * This is preserved across logout and session expiration
 */
export function saveAppVersion(): void {
  localStorage.setItem(APP_VERSION_KEY, APP_VERSION)
  console.log(`[Version] Saved app version: ${APP_VERSION}`)
}

/**
 * Get application version from localStorage
 */
export function getAppVersion(): string | null {
  return localStorage.getItem(APP_VERSION_KEY)
}

/**
 * Clear all storage data (localStorage, sessionStorage, cookies, and pinia stores)
 * PRESERVES: Application version
 */
export function clearAllStorage(): void {
  // Save version before clearing
  const savedVersion = getAppVersion()

  // Clear old localStorage session key (for backward compatibility with old app version)
  localStorage.removeItem('ygpw_session')

  // Clear all localStorage
  localStorage.clear()

  // Restore version
  if (savedVersion) {
    localStorage.setItem(APP_VERSION_KEY, savedVersion)
  }

  // Clear sessionStorage
  sessionStorage.clear()

  // Clear all cookies
  deleteAllCookies()

  // Clear pinia stores
  const authStore = useAuthStore()
  const chatStore = useChatStore()

  authStore.logout()
  chatStore.unsubscribeFromUpdates()
  chatStore.setMessages([])
  chatStore.setUsers([])
}

/**
 * Handle session expiration - clean up all data and redirect to login
 * NOTE: This function only handles cleanup and redirect via window.location
 * Make sure router guard or component doesn't call router.push after this
 */
export function handleSessionExpiration(): void {
  // Clear all storage silently (no toast here, let caller handle toast)
  clearAllStorage()

  // Redirect using window.location to force full page reload
  // This clears all Vue state and forces fresh initialization
  window.location.href = '/create-account'
}

/**
 * Get remaining cookie time in milliseconds
 * @returns Remaining time in ms, or -1 if cookie doesn't exist or is expired
 */
export function getRemainingCookieTime(expiresAtTimestamp: number): number {
  const now = Date.now()
  const remaining = expiresAtTimestamp - now

  return remaining > 0 ? remaining : -1
}

/**
 * Check if session is expired based on timestamp
 * @returns True if expired
 */
export function isSessionExpired(expiresAtTimestamp: number): boolean {
  return Date.now() >= expiresAtTimestamp
}
