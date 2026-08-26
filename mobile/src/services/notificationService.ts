import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { AppState, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Message } from '@/types'
import { subscribeRawMessages } from '@/stores/chatStore'

const TOGGLE_KEY = 'notifications_enabled_v1'

let enabled = true
let currentUserId: string | null = null
let lastNotifiedMessageId: string | null = null

/**
 * How notifications behave while the app is OPEN (foreground).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function setNotificationUserId(userId: string | null) {
  currentUserId = userId
}

export async function loadEnabledFlag(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(TOGGLE_KEY)
    if (stored !== null) enabled = stored === 'true'
  } catch {}
}

export function isNotificationsEnabled(): boolean {
  return enabled
}

export async function setNotificationsEnabled(value: boolean): Promise<void> {
  enabled = value
  try {
    await AsyncStorage.setItem(TOGGLE_KEY, String(value))
  } catch {}
}

/**
 * Ask OS permission. Returns final granted state.
 */
export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('[Notif] Push needs a physical device')
    return false
  }
  const settings = await Notifications.getPermissionsAsync()
  if (settings.granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return req.granted || Boolean((req as { ios?: { status?: number } }).ios)
}

function previewOf(m: Message): string {
  if (isStickerText(m.content)) return '🖼️ Mengirim stiker'
  if (m.attachments?.length || m.imageUrl) return '🖼️ Foto'
  if (m.fileUrl || m.attachments?.length) return '📄 File'
  if (m.isLiveLocation) return '📍 Live Location'
  return m.content.slice(0, 120)
}

function isStickerText(text: string): boolean {
  return /^\[STIKER:[a-z0-9_]+\]$/.test(text.trim())
}

async function present(m: Message): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${m.animal ?? ''} ${m.username}`.trim(),
      body: previewOf(m),
      sound: 'default',
    },
    trigger: null, // show immediately
  })
}

/**
 * Bridge Firestore message snapshots → local notifications.
 * Only notifies when the app is NOT in the foreground and the message
 * is from someone else.
 */
export function startMessageNotifier(): () => void {
  return subscribeRawMessages((msgs) => {
    if (!enabled || !currentUserId) return
    if (AppState.currentState === 'active') return
    if (msgs.length === 0) return

    // Snapshot is newest-first; [0] is the latest message.
    const latest = msgs[0]
    if (!latest || latest.userId === currentUserId) return
    if (latest.id === lastNotifiedMessageId) return

    lastNotifiedMessageId = latest.id
    present(latest).catch(() => {})
  })
}

/**
 * Register for remote push (FCM/APNs). Requires a development build —
 * returns null in Expo Go. Call after login once EAS build is set up:
 *
 *   const token = await registerPushToken('YOUR_EXPO_PROJECT_ID')
 */
export async function registerPushToken(
  projectId?: string
): Promise<string | null> {
  if (!Device.isDevice) return null
  const granted = await requestPermission()
  if (!granted) return null
  try {
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      )
    ).data
    console.log('[Notif] Expo push token:', token)
    return token
  } catch (e) {
    console.warn(
      '[Notif] Push token unavailable (expected in Expo Go):',
      e instanceof Error ? e.message : e
    )
    return null
  }
}

/** Android 13+ requires a channel before posting. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Pesan baru',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  })
}
