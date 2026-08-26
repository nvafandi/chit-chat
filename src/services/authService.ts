import {
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from './firebase'
import { getUserById } from './firebase'
void 0
import { getRandomAnimal } from '@/utils/animals'
import type { User } from '@/types'

export type SocialProvider = 'google' | 'github'

function makeProvider(kind: SocialProvider) {
  return kind === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider()
}

function deriveUsername(fu: import('firebase/auth').User): string {
  return (
    fu.displayName?.trim() ||
    fu.email?.split('@')[0] ||
    `user-${fu.uid.slice(0, 6)}`
  )
}

/** Fetch existing profile or provision one for a first-time social login. */
async function ensureProfile(fu: import('firebase/auth').User): Promise<User> {
  const existing = await getUserById(fu.uid)
  const photoUrl = fu.photoURL ?? undefined

  if (existing) {
    // Keep the stored photo in sync when the user changes it upstream
    if (photoUrl && existing.photoUrl !== photoUrl) {
      const { doc, updateDoc } = await import('firebase/firestore')
      await updateDoc(doc(await getDb(), 'users', fu.uid), { photoUrl })
      return { ...existing, photoUrl }
    }
    return existing
  }

  const { doc, setDoc } = await import('firebase/firestore')
  const profile: User = {
    id: fu.uid,
    username: deriveUsername(fu),
    animal: getRandomAnimal(),
    photoUrl,
    createdAt: Date.now(),
  }
  await setDoc(doc(await getDb(), 'users', fu.uid), profile)
  return profile
}

async function getDb() {
  const { db } = await import('./firebase')
  return db
}

/**
 * Social login. Uses a popup on desktop; falls back to full-page redirect
 * when popups are blocked / unsupported (mobile browsers).
 * When a redirect happens this resolves `null` — completion is picked up by
 * `completeRedirectLogin()` after the page reloads.
 */
export async function loginWithProvider(
  kind: SocialProvider
): Promise<{ ok: boolean; redirected?: boolean; user?: User }> {
  try {
    const result = await signInWithPopup(auth, makeProvider(kind))
    const user = await ensureProfile(result.user)
    return { ok: true, user }
  } catch (err) {
    const code = (err as { code?: string }).code
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, makeProvider(kind))
      return { ok: false, redirected: true }
    }
    throw err
  }
}

/** Handle return from a redirect login (no-op when it was a popup). */
export async function completeRedirectLogin(): Promise<User | null> {
  const res = await getRedirectResult(auth)
  return res ? ensureProfile(res.user) : null
}

/** Wait until Firebase resolves the persisted session (or null). */
export function waitForAuth(): Promise<import('firebase/auth').User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (fu) => {
      unsub()
      resolve(fu)
    })
  })
}

// Kept for reference/migration of the previous username+password system.
export async function registerWithUsername(username: string, password: string): Promise<User> {
  const trimmed = username.trim()
  const cred = await createUserWithEmailAndPassword(
    auth,
    `${trimmed.toLowerCase()}@users.chitchut.app`,
    password
  )
  const profile: User = {
    id: cred.user.uid,
    username: trimmed,
    animal: getRandomAnimal(),
    createdAt: Date.now(),
  }
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(await getDb(), 'users', cred.user.uid), profile)
  return profile
}

export async function loginWithUsername(username: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(
    auth,
    `${username.trim().toLowerCase()}@users.chitchut.app`,
    password
  )
  const profile = await getUserById(cred.user.uid)
  if (!profile) throw new Error('Profil tidak ditemukan')
  return profile
}

export function logoutFirebase(): Promise<void> {
  return signOut(auth)
}
