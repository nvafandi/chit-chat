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
  for (const fn of rawMessageListeners) fn(msgs)
}

interface ChatState {
  messages: Message[]
  users: User[]
  rooms: ChatRoom[]
  currentRoomId: string
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  setCurrentRoom: (roomId: string) => void
  loadMore: () => Promise<void>
  connect: (userId: string) => void
  disconnect: () => void
}

let unsubMessages: (() => void) | null = null
let unsubUsers: (() => void) | null = null
let unsubRooms: (() => void) | null = null

export const useChatStore = create<ChatState>((set, getState) => ({
  messages: [],
  users: [],
  rooms: [],
  currentRoomId: DEFAULT_ROOM_ID,
  isLoading: true,
  isLoadingMore: false,
  hasMore: true,

  setCurrentRoom(roomId) {
    if (getState().currentRoomId === roomId) return
    unsubMessages?.()
    set({ currentRoomId: roomId, messages: [], isLoading: true, hasMore: true })
    unsubMessages = subscribeToMessages((msgs) => {
      emitRawMessages(msgs)
      set((state) => ({
        messages: mergeMessages(state.messages, msgs),
        isLoading: false,
        hasMore: state.hasMore && msgs.length >= MESSAGES_PER_PAGE,
      }))
    }, roomId)
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

  connect(userId) {
    if (!unsubMessages) {
      unsubMessages = subscribeToMessages((msgs) => {
        emitRawMessages(msgs)
        set((state) => ({
          messages: mergeMessages(state.messages, msgs),
          isLoading: false,
          hasMore: state.hasMore && msgs.length >= MESSAGES_PER_PAGE,
        }))
      }, getState().currentRoomId)
    }
    if (!unsubUsers) {
      unsubUsers = subscribeToUsers((users) => set({ users }))
    }
    if (!unsubRooms) {
      unsubRooms = subscribeToRooms(userId, (rooms) => {
        // 'General' is a virtual room (no Firestore doc) — always keep it first
        const withGeneral: ChatRoom[] = rooms.some((r) => r.id === DEFAULT_ROOM_ID)
          ? rooms
          : [
              {
                id: DEFAULT_ROOM_ID,
                name: 'General',
                type: 'room',
                createdBy: '',
                createdByName: '',
                members: [],
                memberDetails: [],
                createdAt: 0,
              },
              ...rooms,
            ]
        set({ rooms: withGeneral })
      })
    }
  },

  disconnect() {
    unsubMessages?.()
    unsubUsers?.()
    unsubRooms?.()
    unsubMessages = unsubUsers = unsubRooms = null
  },
}))
