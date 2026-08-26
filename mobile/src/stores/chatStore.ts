import { create } from 'zustand'
import type { Message, User, ChatRoom } from '@/types'
import {
  subscribeToMessages,
  subscribeToUsers,
  getMessagesBefore,
} from '@/services/firebase'
import { DEFAULT_ROOM_ID } from '@/utils/const'

interface ChatState {
  messages: Message[]
  users: User[]
  rooms: ChatRoom[]
  currentRoomId: string
  isLoading: boolean
  unsubscribeMessages: (() => void) | null
  unsubscribeUsers: (() => void) | null
  setMessages: (messages: Message[]) => void
  setUsers: (users: User[]) => void
  setRooms: (rooms: ChatRoom[]) => void
  setCurrentRoom: (roomId: string) => void
  loadOlderMessages: (before: Message) => Promise<Message[]>
  connect: () => void
  disconnect: () => void
}

export const useChatStore = create<ChatState>((set, getState) => ({
  messages: [],
  users: [],
  rooms: [],
  currentRoomId: DEFAULT_ROOM_ID,
  isLoading: false,
  unsubscribeMessages: null,
  unsubscribeUsers: null,

  setMessages: (messages) => set({ messages }),
  setUsers: (users) => set({ users }),
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (roomId) => {
    if (getState().currentRoomId === roomId) return
    // Re-subscribe to the new room's messages
    const { unsubscribeMessages } = getState()
    unsubscribeMessages?.()
    set({ currentRoomId: roomId, messages: [], isLoading: true })
    const unsub = subscribeToMessages((msgs) => {
      set({ messages: msgs, isLoading: false })
    }, roomId)
    set({ unsubscribeMessages: unsub })
  },

  async loadOlderMessages(before) {
    const older = await getMessagesBefore(before, getState().currentRoomId)
    return older
  },

  connect() {
    const { unsubscribeMessages, unsubscribeUsers } = getState()
    if (!unsubscribeMessages) {
      const unsub = subscribeToMessages((msgs) => {
        set({ messages: msgs, isLoading: false })
      }, getState().currentRoomId)
      set({ unsubscribeMessages: unsub })
    }
    if (!unsubscribeUsers) {
      const unsub = subscribeToUsers((users) => set({ users }))
      set({ unsubscribeUsers: unsub })
    }
  },

  disconnect() {
    getState().unsubscribeMessages?.()
    getState().unsubscribeUsers?.()
    set({ unsubscribeMessages: null, unsubscribeUsers: null })
  },
}))
