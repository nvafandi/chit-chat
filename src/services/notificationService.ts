/**
 * Notification Service
 * Handles browser notifications, sound notifications, and toast notifications for new messages
 */

import type { Message } from '@/types'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

interface ToastNotification {
  id: string
  username: string
  animal: string
  content: string
  timestamp: number
  messageId: string
}

// Audio context for notification sounds
let audioContext: AudioContext | null = null

/**
 * Initialize audio context (required for sound in some browsers)
 * Must be called after user interaction
 */
export function initAudioContext(): AudioContext | null {
  if (audioContext) {
    return audioContext
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) {
      console.warn('[Notification] AudioContext API not available')
      return null
    }

    audioContext = new AudioContextClass()
    console.log('[Notification] AudioContext initialized, state:', audioContext.state)
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch((err) => {
        console.warn('[Notification] Could not resume audio context:', err)
      })
    }
    
    return audioContext
  } catch (error) {
    console.error('[Notification] Error initializing AudioContext:', error)
    return null
  }
}

/**
 * Ensure audio context is ready (with fallback)
 */
function ensureAudioContext(): AudioContext | null {
  if (!audioContext) {
    audioContext = initAudioContext()
  }
  
  // Try to resume if suspended
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch((err) => {
      console.warn('[Notification] Audio context still suspended:', err)
    })
  }
  
  return audioContext
}

/**
 * Play notification sound using Web Audio API
 * Creates a simple beep tone
 */
export function playNotificationSound(): void {
  console.log('[Sound] playNotificationSound() called')
  
  try {
    const ctx = ensureAudioContext()
    if (!ctx) {
      console.warn('[Sound] AudioContext not available')
      return
    }

    console.log('[Sound] AudioContext state:', ctx.state)

    const now = ctx.currentTime
    const duration = 0.3

    // Create oscillator for notification sound
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    // Frequency ramping
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + duration)

    // Volume envelope with stronger initial volume
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

    osc.start(now)
    osc.stop(now + duration)

    console.log('[Sound] Notification sound played successfully')
  } catch (error) {
    console.error('[Sound] Error playing sound:', error)
  }
}

/**
 * Play notification sound with two tones (like WhatsApp)
 */
export function playNotificationSoundDouble(): void {
  console.log('[Sound] playNotificationSoundDouble() called')
  
  try {
    const ctx = ensureAudioContext()
    if (!ctx) {
      console.warn('[Sound] AudioContext not available for double sound')
      return
    }

    console.log('[Sound] AudioContext state:', ctx.state)

    const now = ctx.currentTime
    const noteDuration = 0.15
    const gap = 0.1

    try {
      // First tone
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.frequency.setValueAtTime(800, now)
      gain1.gain.setValueAtTime(0.5, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + noteDuration)
      osc1.start(now)
      osc1.stop(now + noteDuration)

      // Second tone (higher pitch)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.setValueAtTime(1000, now + noteDuration + gap)
      gain2.gain.setValueAtTime(0.5, now + noteDuration + gap)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + noteDuration + gap + noteDuration)
      osc2.start(now + noteDuration + gap)
      osc2.stop(now + noteDuration + gap + noteDuration)

      console.log('[Sound] Double tone sound played successfully')
    } catch (err) {
      console.error('[Sound] Error during double tone creation:', err)
    }
  } catch (error) {
    console.error('[Sound] Error playing double sound:', error)
  }
}

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('[Notification] Browser does not support notifications')
    return false
  }

  // If already granted
  if (Notification.permission === 'granted') {
    return true
  }

  // If already denied, don't ask again
  if (Notification.permission === 'denied') {
    console.warn('[Notification] User has denied notification permission')
    return false
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('[Notification] Error requesting permission:', error)
    return false
  }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Send a notification
 */
export function sendNotification(options: NotificationOptions): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    console.warn('[Notification] Notifications not available or not permitted')
    return null
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/vite.svg',
      badge: options.badge,
      tag: options.tag || 'chit-chat-notification',
      requireInteraction: options.requireInteraction ?? false,
    })

    return notification
  } catch (error) {
    console.error('[Notification] Error sending notification:', error)
    return null
  }
}

/**
 * Send notification for new message with enhanced browser notification
 * Returns both browser notification and toast notification data
 */
export function notifyNewMessage(
  message: Message,
  currentUserId: string,
  isPageVisible: boolean = true,
): { browserNotification: Notification | null; toastData: ToastNotification | null } {
  // Don't notify for messages from current user
  if (message.userId === currentUserId) {
    return { browserNotification: null, toastData: null }
  }

  // Don't notify for deleted messages
  if (message.hidden) {
    return { browserNotification: null, toastData: null }
  }

  // Truncate long messages for browser notification
  const maxLength = 100
  const messagePreview =
    message.content.length > maxLength
      ? message.content.substring(0, maxLength) + '...'
      : message.content

  // Build sender name with animal emoji
  const senderName = message.animal ? `${message.animal} ${message.username}` : message.username

  // For background tabs, make notification more persistent and prominent
  const isBackground = !isPageVisible
  
  const browserNotification = sendNotification({
    title: `💬 ${senderName}`,
    body: messagePreview,
    icon: '/vite.svg',
    tag: `message-${message.id}`,
    requireInteraction: isBackground, // Require user interaction if page is in background
  })

  if (browserNotification) {
    // Click handler to focus window
    browserNotification.onclick = () => {
      window.focus()
      browserNotification.close()
    }
  }

  // Create toast notification data
  const toastData: ToastNotification = {
    id: `toast-${message.id}`,
    username: message.username,
    animal: message.animal || '👤',
    content: message.content,
    timestamp: message.timestamp,
    messageId: message.id,
  }

  return { browserNotification, toastData }
}

/**
 * Send notification for multiple new messages
 * Returns array of notifications and toasts
 */
export function notifyMultipleMessages(
  newMessages: Message[],
  currentUserId: string,
): Array<{ browserNotification: Notification | null; toastData: ToastNotification | null }> {
  return newMessages.map((message) => notifyNewMessage(message, currentUserId))
}

/**
 * Send notification when user is mentioned in a message
 * Returns both browser notification and toast notification data
 */
export function notifyMentioned(
  message: Message,
  currentUserId: string,
  isPageVisible: boolean = true,
): { browserNotification: Notification | null; toastData: ToastNotification | null } {
  // Don't notify for messages from current user
  if (message.userId === currentUserId) {
    return { browserNotification: null, toastData: null }
  }

  // Don't notify for deleted messages
  if (message.hidden) {
    return { browserNotification: null, toastData: null }
  }

  // Truncate long messages for browser notification
  const maxLength = 100
  const messagePreview =
    message.content.length > maxLength
      ? message.content.substring(0, maxLength) + '...'
      : message.content

  // Build sender name with animal emoji
  const senderName = message.animal ? `${message.animal} ${message.username}` : message.username

  // For background tabs, make notification more persistent and prominent
  const isBackground = !isPageVisible

  const browserNotification = sendNotification({
    title: `🔔 ${senderName} mentioned you`,
    body: messagePreview,
    icon: '/vite.svg',
    tag: `mention-${message.id}`,
    requireInteraction: isBackground, // Require user interaction if page is in background
  })

  if (browserNotification) {
    // Click handler to focus window
    browserNotification.onclick = () => {
      window.focus()
      browserNotification.close()
    }
  }

  // Create toast notification data
  const toastData: ToastNotification = {
    id: `mention-toast-${message.id}`,
    username: message.username,
    animal: message.animal || '👤',
    content: message.content,
    timestamp: message.timestamp,
    messageId: message.id,
  }

  return { browserNotification, toastData }
}

/**
 * Close all notifications (util function)
 */
export function closeAllNotifications(): void {
  // Note: Web Notification API doesn't provide a direct way to close all notifications,
  // but we can track them if needed in future implementation
  console.log('[Notification] Closing all notifications')
}

export default {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  sendNotification,
  playNotificationSound,
  playNotificationSoundDouble,
  notifyNewMessage,
  notifyMentioned,
  notifyMultipleMessages,
  closeAllNotifications,
}

export type { NotificationOptions, ToastNotification }
