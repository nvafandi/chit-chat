import type { Message, User } from '@/types'
import { useSyncExternalStore } from 'react'

interface ChatState {
  messages: Message[]
  users: User[]
  totalMessageCount: number
  isLoading: boolean
  error: string | null
  notificationsEnabled: boolean
  lastNotifiedMessageId: string | null
}

const listeners = new Set<() => void>()
let state: ChatState = {
  messages: [],
  users: [],
  totalMessageCount: 0,
  isLoading: false,
  error: null,
  notificationsEnabled: false,
  lastNotifiedMessageId: null,
}

let unsubscribeMessages: (() => void) | null = null
let unsubscribeUsers: (() => void) | null = null
let unsubscribeMessageCount: (() => void) | null = null

function emit() {
  listeners.forEach(l => l())
}

export const chatStore = {
  getState() {
    return state
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  setMessages(newMessages: Message[]) {
    state = { ...state, messages: newMessages }
    emit()
  },
  syncMessages(newMessages: Message[]) {
    state = { ...state, messages: newMessages }
    emit()
  },
  addMessage(message: Message) {
    state = { ...state, messages: [...state.messages, message] }
    emit()
  },
  prependMessages(newMessages: Message[]) {
    state = { ...state, messages: [...newMessages, ...state.messages] }
    emit()
  },
  updateMessageHidden(messageId: string, hidden: boolean) {
    state = {
      ...state,
      messages: state.messages.map(m => m.id === messageId ? { ...m, hidden } : m)
    }
    emit()
  },
  setUsers(newUsers: User[]) {
    state = { ...state, users: newUsers }
    emit()
  },
  setLoading(loading: boolean) {
    state = { ...state, isLoading: loading }
    emit()
  },
  setError(err: string | null) {
    state = { ...state, error: err }
    emit()
  },
  clearError() {
    state = { ...state, error: null }
    emit()
  },
  subscribeToUpdates(callback: (messages: Message[]) => void) {
    return callback
  },
  unsubscribeFromUpdates() {
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
  },
  setUnsubscribe(fn: () => void) {
    unsubscribeMessages = fn
  },
  setUnsubscribeUsers(fn: () => void) {
    unsubscribeUsers = fn
  },
  setUnsubscribeMessageCount(fn: () => void) {
    unsubscribeMessageCount = fn
  },
  setMessageCount(count: number) {
    state = { ...state, totalMessageCount: count }
    emit()
  },
  setNotificationsEnabled(enabled: boolean) {
    state = { ...state, notificationsEnabled: enabled }
    emit()
  },
  setLastNotifiedMessageId(messageId: string | null) {
    state = { ...state, lastNotifiedMessageId: messageId }
    emit()
  }
}

export function useChatStore() {
  const currentState = useSyncExternalStore(chatStore.subscribe, chatStore.getState)
  return {
    ...currentState,
    setMessages: chatStore.setMessages,
    syncMessages: chatStore.syncMessages,
    addMessage: chatStore.addMessage,
    prependMessages: chatStore.prependMessages,
    updateMessageHidden: chatStore.updateMessageHidden,
    setUsers: chatStore.setUsers,
    setLoading: chatStore.setLoading,
    setError: chatStore.setError,
    clearError: chatStore.clearError,
    subscribeToUpdates: chatStore.subscribeToUpdates,
    unsubscribeFromUpdates: chatStore.unsubscribeFromUpdates,
    setUnsubscribe: chatStore.setUnsubscribe,
    setUnsubscribeUsers: chatStore.setUnsubscribeUsers,
    setUnsubscribeMessageCount: chatStore.setUnsubscribeMessageCount,
    setMessageCount: chatStore.setMessageCount,
    setNotificationsEnabled: chatStore.setNotificationsEnabled,
    setLastNotifiedMessageId: chatStore.setLastNotifiedMessageId,
  }
}
