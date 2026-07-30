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
  DocumentSnapshot,
} from 'firebase/firestore'
import { FIREBASE_CONFIG, COLLECTIONS, MESSAGES_PER_PAGE } from '@/utils/const'
import type { User, Message, ReplyTo } from '@/types'
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
  }>
): Promise<Message> {
  const newMessage: Message = {
    id: uuidv4(),
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
    ...(attachments && attachments.length > 0 && { attachments })
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

export async function getMessages(): Promise<Message[]> {
  try {
    const q = query(
      collection(db, 'messages'),
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
 * @returns Array of messages (oldest to newest chronological order)
 */
export async function getMessagesBefore(beforeCursor: Message): Promise<Message[]> {
  try {
    // Get the document snapshot for cursor-based pagination
    const cursorQuery = query(
      collection(db, 'messages'),
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

export function subscribeToMessages(callback: (messages: Message[]) => void): () => void {
  try {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
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

// Subscribe to total message count (real-time)
export function subscribeToMessageCount(callback: (count: number) => void): () => void {
  try {
    const q = query(collection(db, COLLECTIONS.MESSAGES))

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
