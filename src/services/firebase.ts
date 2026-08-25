import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  startAfter,
  arrayUnion,
  DocumentReference,
  DocumentSnapshot,
} from 'firebase/firestore'
import { FIREBASE_CONFIG, COLLECTIONS, MESSAGES_PER_PAGE, MESSAGE_EXPIRATION_TIME, DEFAULT_ROOM_ID } from '@/utils/const'
import type { User, Message, ReplyTo, ChatRoom, MemberInfo } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { getRandomAnimal } from '@/utils/animals'

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG)
const db = getFirestore(app)

// Users Collection Functions
// Users Collection Functions - REGISTRATION
export async function registerUser(
  username: string,
  password: string,
  selectedAnimal?: string
): Promise<User> {
  const trimmedUsername = username.trim()
  
  // Check if username already exists
  const existingUser = await getUserByUsername(trimmedUsername)
  if (existingUser) {
    throw new Error(`Username "${trimmedUsername}" already exists. Please choose a different username.`)
  }

  // Validate password
  if (!password || password.length < 3) {
    throw new Error('Password must be at least 3 characters')
  }

  const userId = uuidv4()
  const newUser: User = {
    id: userId,
    username: trimmedUsername,
    password, // In production, this should be hashed
    animal: selectedAnimal || getRandomAnimal(),
    createdAt: Date.now(),
  }

  try {
    await addDoc(collection(db, COLLECTIONS.USERS), newUser)
    return newUser
  } catch (error) {
    console.error('Error registering user:', error)
    throw error
  }
}

// LOGIN function
export async function loginUser(username: string, password: string): Promise<User> {
  const trimmedUsername = username.trim()

  try {
    const user = await getUserByUsername(trimmedUsername)

    if (!user) {
      throw new Error(`Username "${trimmedUsername}" not found. Please register first.`)
    }

    // Verify password
    if (user.password !== password) {
      throw new Error('Password is incorrect. Please try again.')
    }

    return user
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    console.error('Error logging in:', error)
    throw new Error('Login failed. Please try again.')
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const q = query(collection(db, COLLECTIONS.USERS), where('id', '==', userId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    const doc = querySnapshot.docs[0]
    return doc.data() as User
  } catch (error) {
    console.error('Error getting user by ID:', error)
    throw error
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const q = query(collection(db, COLLECTIONS.USERS), where('username', '==', username))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    // If multiple users exist with same username (shouldn't happen), return the most recent one
    const users = querySnapshot.docs.map((doc) => doc.data() as User)
    if (users.length > 1) {
      console.warn(`Multiple users found with username "${username}". Returning most recent.`)
      return users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]
    }

    return users[0]
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
}

export async function deleteUserByUsername(username: string): Promise<void> {
  try {
    const q = query(collection(db, COLLECTIONS.USERS), where('username', '==', username))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.warn('User not found for deletion:', username)
      return
    }

    // If multiple users exist with same username, delete all but the most recent one
    if (querySnapshot.docs.length > 1) {
      const users = querySnapshot.docs.map((doc) => ({
        ref: doc.ref,
        data: doc.data() as User,
      }))

      // Sort by createdAt descending, keep the first one (most recent)
      users.sort((a, b) => (b.data.createdAt || 0) - (a.data.createdAt || 0))

      // Delete all but the most recent
      for (let i = 1; i < users.length; i++) {
        await deleteDoc(users[i].ref)
        console.log(`Deleted duplicate user: ${username}`)
      }

      return
    }

    // Delete single user
    const docRef = querySnapshot.docs[0].ref
    await deleteDoc(docRef)
    console.log('User deleted:', username)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

// Messages Collection Functions
export async function sendMessage(
  userId: string,
  username: string,
  animal: string,
  content: string,
  replyTo?: ReplyTo,
  imageUrl?: string,
  imageSize?: number,
  originalImageSize?: number,
  imageName?: string,
  fileUrl?: string,
  fileSize?: number,
  originalFileSize?: number,
  fileName?: string,
  fileType?: string,
  stickerData?: {
    id: string
    type: 'emoji' | 'image'
    content: string
    name: string
  },
  attachments?: Array<{
    id: string
    url: string
    type: 'image' | 'file'
    mimeType: string
    name: string
    size: number
    originalSize?: number
    compressedSize?: number
  }>,
  location?: {
    latitude: number
    longitude: number
    label?: string
  },
  roomId?: string
): Promise<Message> {
  const newMessage: Message = {
    id: uuidv4(),
    roomId: roomId || DEFAULT_ROOM_ID,
    userId,
    username,
    animal,
    content,
    timestamp: Date.now(),
    ...(replyTo && { replyTo }),
    ...(imageUrl && { imageUrl }),
    ...(imageSize && { imageSize }),
    ...(originalImageSize && { originalImageSize }),
    ...(imageName && { imageName }),
    ...(fileUrl && { fileUrl }),
    ...(fileSize && { fileSize }),
    ...(originalFileSize && { originalFileSize }),
    ...(fileName && { fileName }),
    ...(fileType && { fileType }),
    ...(stickerData && { stickerData }),
    ...(attachments && attachments.length > 0 && { attachments }),
    ...(location && { location })
  }

  try {
    await addDoc(collection(db, COLLECTIONS.MESSAGES), newMessage)
    return newMessage
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

export async function hideMessage(messageId: string): Promise<void> {
  try {
    // Find the document by the message id field
    const q = query(collection(db, COLLECTIONS.MESSAGES), where('id', '==', messageId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error(`Message with id "${messageId}" not found`)
    }

    // Update the first matching document (should only be one)
    const docRef = querySnapshot.docs[0].ref
    await updateDoc(docRef, {
      hidden: true,
    })

    console.log('Message hidden:', messageId)
  } catch (error) {
    console.error('Error hiding message:', error)
    throw error
  }
}

/**
 * Pin a message
 * @param messageId - The message ID to pin
 * @param pinnedBy - Username of the person pinning
 */
export async function pinMessage(messageId: string, pinnedBy: string): Promise<void> {
  try {
    const q = query(collection(db, COLLECTIONS.MESSAGES), where('id', '==', messageId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error(`Message with id "${messageId}" not found`)
    }

    const docRef = querySnapshot.docs[0].ref
    await updateDoc(docRef, {
      pinned: true,
      pinnedAt: Date.now(),
      pinnedBy: pinnedBy,
    })

    console.log('Message pinned:', messageId)
  } catch (error) {
    console.error('Error pinning message:', error)
    throw error
  }
}

/**
 * Unpin a message
 * @param messageId - The message ID to unpin
 */
export async function unpinMessage(messageId: string): Promise<void> {
  try {
    const q = query(collection(db, COLLECTIONS.MESSAGES), where('id', '==', messageId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      throw new Error(`Message with id "${messageId}" not found`)
    }

    const docRef = querySnapshot.docs[0].ref
    await updateDoc(docRef, {
      pinned: false,
      pinnedAt: null,
      pinnedBy: null,
    })

    console.log('Message unpinned:', messageId)
  } catch (error) {
    console.error('Error unpinning message:', error)
    throw error
  }
}

export async function getMessages(roomId: string = DEFAULT_ROOM_ID): Promise<Message[]> {
  try {
    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_PER_PAGE)
    )
    const querySnapshot = await getDocs(q)
    // Query newest-first for efficiency, then reverse for chronological UI rendering.
    return querySnapshot.docs.map((doc) => doc.data() as Message).reverse()
  } catch (error) {
    console.error('Error getting messages:', error)
    throw error
  }
}

/**
 * Get previous messages for pagination (load older messages when scrolling up)
 * @param beforeCursor - The oldest message to load messages before
 * @param roomId - Room to load messages from
 * @returns Array of messages (oldest to newest chronological order)
 */
export async function getMessagesBefore(beforeCursor: Message, roomId: string = DEFAULT_ROOM_ID): Promise<Message[]> {
  try {
    // Get the document snapshot for cursor-based pagination
    const cursorQuery = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      where('timestamp', '==', beforeCursor.timestamp)
    )
    const cursorSnapshot = await getDocs(cursorQuery)
    
    // Find the exact document
    let cursorDoc: DocumentSnapshot | null = null
    for (const doc of cursorSnapshot.docs) {
      const data = doc.data() as Message
      if (data.id === beforeCursor.id) {
        cursorDoc = doc
        break
      }
    }

    if (!cursorDoc) {
      console.warn('Cursor document not found for pagination')
      return []
    }

    // Query for messages before cursor (older messages)
    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      startAfter(cursorDoc),
      limit(MESSAGES_PER_PAGE)
    )
    const querySnapshot = await getDocs(q)
    // Query newest-first for efficiency, then reverse for chronological UI rendering.
    return querySnapshot.docs.map((doc) => doc.data() as Message).reverse()
  } catch (error) {
    console.error('Error getting messages before cursor:', error)
    throw error
  }
}

export function subscribeToMessages(callback: (messages: Message[]) => void, roomId: string = DEFAULT_ROOM_ID): () => void {
  try {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_PER_PAGE)
    )

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      // Keep chronological order in UI while the query tracks latest messages.
      const messages = querySnapshot.docs.map((doc) => doc.data() as Message).reverse()
      callback(messages)
    })

    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to messages:', error)
    throw error
  }
}

// Subscribe to total message count (real-time), scoped to a room
export function subscribeToMessageCount(callback: (count: number) => void, roomId?: string): () => void {
  try {
    const baseQuery = collection(db, COLLECTIONS.MESSAGES)
    const q = roomId
      ? query(baseQuery, where('roomId', '==', roomId))
      : query(baseQuery)

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      callback(querySnapshot.size)
    })

    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to message count:', error)
    throw error
  }
}

// Users Collection Functions for counting
export async function getUsers(): Promise<User[]> {
  try {
    const q = query(collection(db, COLLECTIONS.USERS))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as User)
  } catch (error) {
    console.error('Error getting users:', error)
    throw error
  }
}

export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.USERS))

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const users = querySnapshot.docs.map((doc) => doc.data() as User)
      callback(users)
    })

    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to users:', error)
    throw error
  }
}

// Clean database functions
export async function cleanMessages(): Promise<void> {
  try {
    console.log('🗑️  Deleting all messages...')
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.MESSAGES))
    let count = 0

    for (const docRef of querySnapshot.docs) {
      await deleteDoc(docRef.ref)
      count++
    }

    console.log(`✅ Deleted ${count} messages`)
  } catch (error) {
    console.error('❌ Error deleting messages:', error)
    throw error
  }
}

export async function cleanUsers(): Promise<void> {
  try {
    console.log('🗑️  Deleting all users...')
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS))
    let count = 0

    for (const docRef of querySnapshot.docs) {
      await deleteDoc(docRef.ref)
      count++
    }

    console.log(`✅ Deleted ${count} users`)
  } catch (error) {
    console.error('❌ Error deleting users:', error)
    throw error
  }
}

/**
 * Delete messages older than MESSAGE_EXPIRATION_TIME (1 week)
 * Excludes pinned messages
 * @returns Number of deleted messages
 */
export async function cleanExpiredMessages(): Promise<number> {
  try {
    console.log('🗑️  Cleaning expired messages (>1 week)...')
    
    const expirationTime = Date.now() - MESSAGE_EXPIRATION_TIME
    let deletedCount = 0
    let pinnedSkipped = 0

    // Query messages older than expiration time
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('timestamp', '<', expirationTime)
    )
    
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.log('📭 No expired messages found')
      return 0
    }

    console.log(`Found ${querySnapshot.size} expired messages`)

    // Delete in batches, skip pinned messages
    const batchSize = 20
    const docs = querySnapshot.docs
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize)
      
      for (const doc of batch) {
        const data = doc.data()
        
        // Skip pinned messages
        if (data.pinned === true) {
          pinnedSkipped++
          continue
        }
        
        await deleteDoc(doc.ref)
        deletedCount++
      }
      
      console.log(`  Processed ${Math.min(i + batchSize, docs.length)}/${docs.length} messages...`)
    }

    if (pinnedSkipped > 0) {
      console.log(`📌 Skipped ${pinnedSkipped} pinned messages`)
    }
    
    console.log(`✅ Deleted ${deletedCount} expired messages`)
    return deletedCount
  } catch (error) {
    console.error('❌ Error cleaning expired messages:', error)
    throw error
  }
}

/**
 * Check if a file URL is used by any pinned message
 * @param fileUrl - The file URL to check
 * @returns true if file is used by a pinned message
 */
export async function isFileUsedByPinnedMessage(fileUrl: string): Promise<boolean> {
  try {
    // Query pinned messages that reference this file URL
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('pinned', '==', true)
    )
    
    const querySnapshot = await getDocs(q)
    
    for (const doc of querySnapshot.docs) {
      const data = doc.data() as Message
      
      // Check if this pinned message uses the file
      if (
        data.imageUrl === fileUrl ||
        data.fileUrl === fileUrl ||
        data.attachments?.some(att => att.url === fileUrl)
      ) {
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking pinned message file:', error)
    return false
  }
}

// ============================================================================
// ROOMS & GROUPS COLLECTION FUNCTIONS
// ============================================================================

/**
 * Create a new channel
 */
export async function createRoom(
  name: string,
  creator: MemberInfo
): Promise<ChatRoom> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Channel name cannot be empty')
  }

  const newRoom: ChatRoom = {
    id: uuidv4(),
    name: trimmedName,
    type: 'room',
    createdBy: creator.id,
    createdByName: creator.username,
    members: [creator.id],
    memberDetails: [creator],
    createdAt: Date.now(),
  }

  try {
    await addDoc(collection(db, COLLECTIONS.ROOMS), newRoom)
    console.log('[Channels] Created channel:', newRoom.name)
    return newRoom
  } catch (error) {
    console.error('Error creating channel:', error)
    throw error
  }
}

/**
 * Get a single room by its id
 */
export async function getRoomById(roomId: string): Promise<ChatRoom | null> {
  try {
    const q = query(collection(db, COLLECTIONS.ROOMS), where('id', '==', roomId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    return querySnapshot.docs[0].data() as ChatRoom
  } catch (error) {
    console.error('Error getting room by ID:', error)
    throw error
  }
}

/**
 * Subscribe to all channels, sorted oldest first.
 */
export function subscribeToRooms(callback: (rooms: ChatRoom[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.ROOMS))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs
        .map((doc) => doc.data() as ChatRoom)
        .sort((a, b) => a.createdAt - b.createdAt)
      callback(rooms)
    }, (error) => console.error('[Channels] Listener error:', error))

    return unsubscribe
  } catch (error) {
    console.error('Error subscribing to rooms:', error)
    throw error
  }
}

/**
 * Track membership when opening a channel.
 */
export async function joinRoom(roomId: string, user: MemberInfo): Promise<void> {
  try {
    const room = await getRoomDocRef(roomId)

    const alreadyMember = room.data.members?.includes(user.id)
    if (!alreadyMember) {
      await updateDoc(room.ref, {
        members: arrayUnion(user.id),
        memberDetails: arrayUnion(user),
      })
    }
    console.log(`[Rooms] ${user.username} joined room:`, room.data.name)
  } catch (error) {
    console.error('Error joining room:', error)
    throw error
  }
}

/**
 * Delete a channel and all of its messages.
 */
export async function deleteRoom(roomId: string): Promise<void> {
  try {
    const room = await getRoomDocRef(roomId)

    // Delete the room's messages first
    const messagesQuery = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('roomId', '==', roomId)
    )
    const messagesSnapshot = await getDocs(messagesQuery)

    for (const msgDoc of messagesSnapshot.docs) {
      await deleteDoc(msgDoc.ref)
    }

    // Delete the room document itself
    await deleteDoc(room.ref)
    console.log(`[Channels] Deleted channel and ${messagesSnapshot.size} message(s):`, room.data.name)
  } catch (error) {
    console.error('Error deleting room:', error)
    throw error
  }
}

/**
 * One-time migration: assign legacy messages (without roomId) to the default room.
 * Runs once per browser (guarded by a localStorage flag).
 */
const ROOM_BACKFILL_KEY = 'room_backfill_v1'

export async function backfillLegacyMessageRooms(): Promise<void> {
  try {
    if (typeof localStorage === 'undefined' || localStorage.getItem(ROOM_BACKFILL_KEY)) {
      return
    }

    console.log(`[Rooms] Backfilling legacy messages into "${DEFAULT_ROOM_ID}"...`)
    const snapshot = await getDocs(collection(db, COLLECTIONS.MESSAGES))

    let updated = 0
    for (const docSnap of snapshot.docs) {
      if (!docSnap.data().roomId) {
        await updateDoc(docSnap.ref, { roomId: DEFAULT_ROOM_ID })
        updated++
      }
    }

    localStorage.setItem(ROOM_BACKFILL_KEY, String(Date.now()))
    console.log(`[Rooms] Backfill complete: ${updated} message(s) assigned to "${DEFAULT_ROOM_ID}"`)
  } catch (error) {
    console.error('[Rooms] Backfill error (non-critical):', error)
  }
}

/** Internal helper: find the Firestore doc for a room by its id field */
async function getRoomDocRef(roomId: string): Promise<{ ref: DocumentReference; data: ChatRoom }> {
  const q = query(collection(db, COLLECTIONS.ROOMS), where('id', '==', roomId))
  const querySnapshot = await getDocs(q)

  if (querySnapshot.empty) {
    throw new Error(`Room with id "${roomId}" not found`)
  }

  const doc = querySnapshot.docs[0]
  return { ref: doc.ref, data: doc.data() as ChatRoom }
}
