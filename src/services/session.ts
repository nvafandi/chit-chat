import type { SessionData } from '@/types'
import { setCookie, getCookie, deleteCookie, hasCookie } from './cookieService'
import { isSessionExpired, clearAllStorage } from './storageCleanup'
import { SESSION_COOKIE_NAME, COOKIE_EXPIRATION_TIME } from '@/utils/const'

/**
 * Migrate session from old localStorage to new cookie-based system
 * This ensures backward compatibility when deploying from old localStorage system
 * @returns true if migration was performed, false otherwise
 */
function migrateFromLocalStorage(): boolean {
  try {
    // Check if old localStorage session exists
    const oldSessionKey = 'ygpw_session' // Same key, but in localStorage instead of cookie
    const oldSessionStr = localStorage.getItem(oldSessionKey)
    
    if (!oldSessionStr) {
      return false // No old session to migrate
    }

    const oldSession = JSON.parse(oldSessionStr)
    
    // Validate old session has required fields
    if (!oldSession.username || !oldSession.userId) {
      console.warn('[Session Migration] Invalid old session format')
      localStorage.removeItem(oldSessionKey)
      return false
    }

    console.log('[Session Migration] Found old localStorage session, migrating to cookie...')

    // Migrate to cookie (add password field if missing, defaulting to empty string)
    const migratedSession: SessionData = {
      username: oldSession.username,
      userId: oldSession.userId,
      animal: oldSession.animal || '', // Animal might not exist in old sessions
      password: oldSession.password || '', // Password might not exist in old sessions
    }

    // Save to new cookie system
    saveSession(migratedSession)

    // Clear old localStorage
    localStorage.removeItem(oldSessionKey)
    console.log('[Session Migration] ✅ Successfully migrated to cookie-based session')
    
    return true
  } catch (error) {
    console.error('[Session Migration] ❌ Error during migration:', error)
    // Don't break the app, just log error and continue
    return false
  }
}

/**
 * Save session as cookie with expiration
 * @param session - Session data to save
 */
export function saveSession(session: SessionData): void {
  const expiresAt = Date.now() + COOKIE_EXPIRATION_TIME
  const cookieValue = JSON.stringify({
    ...session,
    expiresAt,
  })

  // Convert milliseconds to seconds for Max-Age
  const maxAgeSeconds = Math.floor(COOKIE_EXPIRATION_TIME / 1000)

  setCookie(SESSION_COOKIE_NAME, cookieValue, {
    maxAge: maxAgeSeconds,
    path: '/',
    secure: false, // Set to true in production with HTTPS
    sameSite: 'Lax',
  })
}

/**
 * Get session from cookie
 * Automatically validates expiration
 * Does NOT attempt automatic migration - migration only happens on explicit login
 * @returns Session data or null if expired or not found
 */
export function getSession(): SessionData | null {
  if (!hasCookie(SESSION_COOKIE_NAME)) {
    // No cookie found - user must login explicitly
    // Migration will only happen during login in CreateAccount.tsx
    return null
  }

  try {
    const sessionStr = getCookie(SESSION_COOKIE_NAME)
    if (!sessionStr) return null

    const session = JSON.parse(sessionStr)

    // Check if session is expired
    if (session.expiresAt && isSessionExpired(session.expiresAt)) {
      // Clean up expired session
      clearSession()
      clearAllStorage()
      return null
    }

    return {
      username: session.username,
      userId: session.userId,
      animal: session.animal,
      password: session.password || '', // Fallback for old cookies without password
    } as SessionData
  } catch (error) {
    console.error('Error parsing session cookie:', error)
    clearSession()
    return null
  }
}

/**
 * Validate if session exists and is not expired
 * @returns true if session is valid, false if expired or doesn't exist
 */
export function validateSession(): boolean {
  const session = getSession()
  return session !== null
}

/**
 * Get session expiration timestamp
 * @returns Expiration timestamp in milliseconds, or null if no session
 */
export function getSessionExpirationTime(): number | null {
  if (!hasCookie(SESSION_COOKIE_NAME)) {
    return null
  }

  try {
    const sessionStr = getCookie(SESSION_COOKIE_NAME)
    if (!sessionStr) return null

    const session = JSON.parse(sessionStr)
    return session.expiresAt || null
  } catch {
    return null
  }
}

/**
 * Get remaining session time in milliseconds
 * @returns Remaining time in ms, or 0 if expired/not found
 */
export function getRemainingSessionTime(): number {
  const expiresAt = getSessionExpirationTime()
  if (!expiresAt) return 0

  const remaining = expiresAt - Date.now()
  return remaining > 0 ? remaining : 0
}

/**
 * Explicitly attempt migration from old localStorage
 * This should ONLY be called during login/register after clearAllStorage()
 * @returns true if migration was successful, false otherwise
 */
export function attemptMigrationFromLocalStorage(): boolean {
  return migrateFromLocalStorage()
}

/**
 * Clear session cookie
 */
export function clearSession(): void {
  deleteCookie(SESSION_COOKIE_NAME)
}

/**
 * Check if session cookie exists
 */
export function hasSession(): boolean {
  return hasCookie(SESSION_COOKIE_NAME) && validateSession()
}
