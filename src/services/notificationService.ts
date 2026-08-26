import { subscribeRawMessages } from '@/stores/chatStore'
import type { Message } from '@/types'

const TOGGLE_KEY = 'web_notifications_enabled'

let enabled = localStorage.getItem(TOGGLE_KEY) === 'true'
let currentUserId: string | null = null
let lastNotifiedId: string | null = null

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function isNotificationsEnabled(): boolean {
  return enabled && isNotificationSupported() && Notification.permission === 'granted'
}

export async function setNotificationsEnabled(value: boolean): Promise<void> {
  enabled = value
  localStorage.setItem(TOGGLE_KEY, String(value))
  if (value && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

export function setNotificationUserId(userId: string | null): void {
  currentUserId = userId
}

function previewOf(m: Message): string {
  if (m.stickerData || /^\[STIKER:[a-z0-9_]+\]$/.test(m.content.trim())) return '🖼️ Mengirim stiker'
  if (m.isLiveLocation) return '📍 Live Location'
  if (m.attachments?.some((a) => a.type === 'image') || m.imageUrl) return '🖼️ Foto'
  if (m.attachments?.length || m.fileUrl) return '📄 File'
  return m.content.slice(0, 120)
}

/**
 * Bridge Firestore snapshots → Web Notifications while the tab is hidden.
 */
export function startMessageNotifier(): () => void {
  return subscribeRawMessages((msgs) => {
    if (!enabled || !currentUserId) return
    if (document.visibilityState === 'visible') return
    if (!isNotificationSupported() || Notification.permission !== 'granted') return
    if (msgs.length === 0) return

    const latest = msgs[0] // newest-first snapshot
    if (!latest || latest.userId === currentUserId) return
    if (latest.id === lastNotifiedId) return

    lastNotifiedId = latest.id
    const n = new Notification(`${latest.animal ?? ''} ${latest.username}`.trim(), {
      body: previewOf(latest),
      icon: latest.attachments?.find((a) => a.type === 'image')?.url,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  })
}
