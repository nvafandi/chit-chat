import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SessionData } from '@/types'
import { SESSION_STORAGE_KEY, COOKIE_EXPIRATION_TIME } from '@/utils/const'

const SESSION_EXPIRY_KEY = `${SESSION_STORAGE_KEY}_expires_at`

/**
 * Save session to AsyncStorage with expiration.
 */
export async function saveSession(session: SessionData): Promise<void> {
  const expiresAt = Date.now() + COOKIE_EXPIRATION_TIME
  await AsyncStorage.multiSet([
    [SESSION_STORAGE_KEY, JSON.stringify(session)],
    [SESSION_EXPIRY_KEY, String(expiresAt)],
  ])
}

/**
 * Get session if valid and not expired.
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const [[, sessionStr], [, expiresAtStr]] = await AsyncStorage.multiGet([
      SESSION_STORAGE_KEY,
      SESSION_EXPIRY_KEY,
    ])

    if (!sessionStr) return null

    const expiresAt = Number(expiresAtStr)
    if (!expiresAt || Date.now() >= expiresAt) {
      await clearSession()
      return null
    }

    return JSON.parse(sessionStr) as SessionData
  } catch {
    return null
  }
}

export async function hasSession(): Promise<boolean> {
  return (await getSession()) !== null
}

export async function getRemainingSessionTime(): Promise<number> {
  const expiresAtStr = await AsyncStorage.getItem(SESSION_EXPIRY_KEY)
  const expiresAt = Number(expiresAtStr)
  if (!expiresAt) return 0
  return Math.max(0, expiresAt - Date.now())
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, SESSION_EXPIRY_KEY])
}
