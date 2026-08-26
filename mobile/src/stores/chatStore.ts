import { create } from 'zustand'
import type { Message, User, ChatRoom } from '@/types'
import {
  subscribeToMessages,
  subscribeToUsers,
  subscribeToRooms,
  getMessagesBefore,
} from '@/services/firebase'
import { DEFAULT_ROOM_ID, MESSAGES_PER_PAGE } from '@/utils/const'

function mergeMessages(existing: Message[], snapshot: Message[]): Message[] {
  const map = new Map<string, Message>()
  for (const m of existing) map.set(m.id, m)
  for (const m of snapshot) map.set(m.id, m)
  return [...map.values()].sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Raw snapshot listeners — fired on every Firestore batch regardless of
 * React rendering, used by e.g. the notification service.
 */
type RawMessageListener = (msgs: Message[]) => void
const rawMessageListeners: RawMessageListener[] = []

export function subscribeRawMessages(fn: RawMessageListener): () => void {
  rawMessageListeners.push(fn)
  return () => {
    const i = rawMessageListeners.indexOf(fn)
    if (i >= 0) rawMessageListeners.splice(i, 1)
  }
}

function emitRawMessages(msgs: Message[]) {
  for (const fn of rawMessageListeners) {
    try {
      fn(msgs)
    } catch {}
  }
}

interface ChatState {
  messages: Message[]
  users: User[]
  rooms: ChatRoom[]
  currentRoomId: string
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  unsubscribeMessages: (() => void) | null
  unsubscribeUsers: (() => void) | null
  unsubscribeRooms: (() => void) | null
  setRooms: (rooms: ChatRoom[]) => void
  setCurrentRoom: (roomId: string) => void
  loadMore: () => Promise<void>
  connect: (userId: string) => void
  disconnect: () => void
}

export const useChatStore = create<ChatState>((set, getState) => ({
  messages: [],
  users: [],
  rooms: [],
  currentRoomId: DEFAULT_ROOM_ID,
  isLoading: true,
  isLoadingMore: false,
  hasMore: true,
  unsubscribeMessages: null,
  unsubscribeUsers: null,
  unsubscribeRooms: null,

  setRooms: (rooms) => set({ rooms }),

  setCurrentRoom: (roomId) => {
    if (getState().currentRoomId === roomId) return
    getState().unsubscribeMessages?.()
    set({
      currentRoomId: roomId,
      messages: [],
      isLoading: true,
      hasMore: true,
      isLoadingMore: false,
    })
    const unsub = subscribeToMessages((msgs) => {
      emitRawMessages(msgs)
      set((state) => ({
        messages: mergeMessages(state.messages, msgs),
        isLoading: false,
        hasMore: state.hasMore && msgs.length >= MESSAGES_PER_PAGE,
      }))
    }, roomId)
    set({ unsubscribeMessages: unsub })
  },

  async loadMore() {
    const { messages, currentRoomId, isLoadingMore, hasMore } = getState()
    if (isLoadingMore || !hasMore || messages.length === 0) return
    set({ isLoadingMore: true })
    try {
      const older = await getMessagesBefore(messages[0], currentRoomId)
      if (older.length === 0) {
        set({ hasMore: false, isLoadingMore: false })
        return
      }
      set((state) => ({
        messages: [...older, ...state.messages],
        isLoadingMore: false,
        hasMore: older.length >= MESSAGES_PER_PAGE,
      }))
    } catch (e) {
      console.warn('[chatStore] loadMore failed:', e)
      set({ isLoadingMore: false })
    }
  },

  connect(userId: string) {
    if (!getState().unsubscribeMessages) {
      const unsub = subscribeToMessages((msgs) => {
        emitRawMessages(msgs)
        set((state) => ({
          messages: mergeMessages(state.messages, msgs),
          isLoading: false,
          hasMore: state.hasMore && msgs.length >= MESSAGES_PER_PAGE,
        }))
      }, getState().currentRoomId)
      set({ unsubscribeMessages: unsub })
    }
    if (!getState().unsubscribeUsers) {
      const unsub = subscribeToUsers((users) => set({ users }))
      set({ unsubscribeUsers: unsub })
    }
    if (!getState().unsubscribeRooms) {
      const unsub = subscribeToRooms(userId, (rooms) => set({ rooms }))
      set({ unsubscribeRooms: unsub })
    }
  },

  disconnect() {
    getState().unsubscribeMessages?.()
    getState().unsubscribeUsers?.()
    getState().unsubscribeRooms?.()
    set({ unsubscribeMessages: null, unsubscribeUsers: null, unsubscribeRooms: null })
  },
}))
