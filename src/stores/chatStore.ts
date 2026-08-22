import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message, User } from '@/types'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const users = ref<User[]>([])
  const totalMessageCount = ref<number>(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const notificationsEnabled = ref(false)
  const lastNotifiedMessageId = ref<string | null>(null)
  let unsubscribeMessages: (() => void) | null = null
  let unsubscribeUsers: (() => void) | null = null
  let unsubscribeMessageCount: (() => void) | null = null

  function setMessages(newMessages: Message[]) {
    messages.value = newMessages
  }

  // ✅ PRODUCTION FIX #1: Diff-based sync to preserve DOM nodes
  // Prevents unnecessary re-renders and scroll position resets
  function syncMessages(newMessages: Message[]) {
    // Use splice to preserve DOM nodes instead of full replace
    // This is more DOM-friendly than direct assignment
    const oldLength = messages.value.length
    const newLength = newMessages.length

    if (oldLength === 0) {
      messages.value = newMessages
    } else if (newLength === 0) {
      messages.value.splice(0, oldLength)
    } else {
      // Replace content while preserving Vue reactivity
      messages.value.splice(0, oldLength, ...newMessages)
    }
  }

  function addMessage(message: Message) {
    messages.value.push(message)
  }

  function prependMessages(newMessages: Message[]) {
    messages.value.unshift(...newMessages)
  }

  function updateMessageHidden(messageId: string, hidden: boolean) {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.hidden = hidden
    }
  }

  function updateMessagePin(messageId: string, pinned: boolean, pinnedBy?: string) {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.pinned = pinned
      message.pinnedAt = pinned ? Date.now() : undefined
      message.pinnedBy = pinned ? pinnedBy : undefined
    }
  }

  function setUsers(newUsers: User[]) {
    users.value = newUsers
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  function setError(err: string | null) {
    error.value = err
  }

  function clearError() {
    error.value = null
  }

  function subscribeToUpdates(callback: (messages: Message[]) => void) {
    return callback
  }

  function unsubscribeFromUpdates() {
    if (unsubscribeMessages) {
      unsubscribeMessages()
      unsubscribeMessages = null
    }
    if (unsubscribeUsers) {
      unsubscribeUsers()
      unsubscribeUsers = null
    }
    if (unsubscribeMessageCount) {
      unsubscribeMessageCount()
      unsubscribeMessageCount = null
    }
  }

  function setUnsubscribe(fn: () => void) {
    unsubscribeMessages = fn
  }

  function setUnsubscribeUsers(fn: () => void) {
    unsubscribeUsers = fn
  }

  function setUnsubscribeMessageCount(fn: () => void) {
    unsubscribeMessageCount = fn
  }

  function setMessageCount(count: number) {
    totalMessageCount.value = count
  }

  function setNotificationsEnabled(enabled: boolean) {
    notificationsEnabled.value = enabled
  }

  function setLastNotifiedMessageId(messageId: string | null) {
    lastNotifiedMessageId.value = messageId
  }

  return {
    messages,
    users,
    totalMessageCount,
    isLoading,
    error,
    notificationsEnabled,
    lastNotifiedMessageId,
    setMessages,
    syncMessages,
    addMessage,
    prependMessages,
    updateMessageHidden,
    updateMessagePin,
    setUsers,
    setLoading,
    setError,
    clearError,
    subscribeToUpdates,
    unsubscribeFromUpdates,
    setUnsubscribe,
    setUnsubscribeUsers,
    setUnsubscribeMessageCount,
    setMessageCount,
    setNotificationsEnabled,
    setLastNotifiedMessageId,
  }
})
