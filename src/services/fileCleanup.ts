import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db, hideMessage } from './firebase'
import { deleteImage, isChunkedManifestUrl } from './supabase'
import {
  FILE_LARGE_SIZE_THRESHOLD,
  FILE_LARGE_EXPIRATION_TIME,
  FILE_EXPIRATION_TIME,
} from '@/utils/const'
import type { Message } from '@/types'

/** Retention window for a given file size: >100MB -> 24h, else 3 days. */
export function retentionMsForSize(size: number): number {
  return size > FILE_LARGE_SIZE_THRESHOLD ? FILE_LARGE_EXPIRATION_TIME : FILE_EXPIRATION_TIME
}

function collectFileRefs(m: Message): { url: string; size: number }[] {
  if (m.attachments?.length) {
    return m.attachments.map((a) => ({ url: a.url, size: a.size ?? 0 }))
  }
  const out: { url: string; size: number }[] = []
  if (m.imageUrl) out.push({ url: m.imageUrl, size: m.imageSize ?? 0 })
  if (m.fileUrl) out.push({ url: m.fileUrl, size: m.fileSize ?? 0 })
  return out
}

/** Delete a storage object; chunked manifests also remove every part. */
async function deleteStorageObject(url: string): Promise<void> {
  if (isChunkedManifestUrl(url)) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const manifest = (await res.json()) as { chunkUrls?: string[] }
        for (const cu of manifest.chunkUrls ?? []) {
          await deleteImage(cu)
        }
      }
    } catch (e) {
      console.warn('[fileCleanup] manifest fetch failed:', e)
    }
  }
  await deleteImage(url)
}

let running = false

/**
 * Scan messages older than the shortest retention window, delete expired
 * storage objects, and hide messages whose files are all gone.
 * Pinned messages are never touched.
 */
export async function runFileCleanup(): Promise<number> {
  if (running) return 0
  running = true
  let cleaned = 0
  try {
    const cutoff = Date.now() - FILE_LARGE_EXPIRATION_TIME
    const q = query(
      collection(db, 'messages'),
      where('timestamp', '<', cutoff),
      orderBy('timestamp', 'asc'),
      limit(300)
    )
    const snap = await getDocs(q)

    for (const docSnap of snap.docs) {
      const m = docSnap.data() as Message
      if (m.hidden || m.pinned) continue

      const refs = collectFileRefs(m)
      if (refs.length === 0) continue

      const now = Date.now()
      const expired = refs.filter(
        (r) => now - m.timestamp > retentionMsForSize(r.size)
      )
      if (expired.length === 0) continue

      for (const r of expired) {
        await deleteStorageObject(r.url)
        cleaned++
      }

      // Every file of this message is gone -> hide it from the chat
      if (expired.length === refs.length) {
        await hideMessage(m.id).catch(() => {})
      }
    }
  } catch (e) {
    console.warn('[fileCleanup] run failed:', e)
  } finally {
    running = false
  }
  return cleaned
}

/** Run once immediately, then every `intervalMs` (default 30 min). */
export function scheduleFileCleanup(intervalMs: number = 30 * 60 * 1000): () => void {
  runFileCleanup().catch(() => {})
  const t = setInterval(() => runFileCleanup().catch(() => {}), intervalMs)
  return () => clearInterval(t)
}
