/**
 * Sticker System - Client-side only
 * Stores sticker data locally, no database changes needed
 */

export interface Sticker {
  id: string
  name: string
  type: 'emoji' | 'image'
  content: string // emoji char or image data URL
  category: string
}

export interface CustomSticker extends Sticker {
  type: 'image'
  uploadedAt: number
}

const CUSTOM_STICKERS_KEY = 'chit_chat_custom_stickers'

/**
 * All available stickers - stored in frontend only
 */
export const STICKERS: Sticker[] = [
  // Emoji Stickers - Category: Emotions
  { id: 'laugh', name: 'Laugh', type: 'emoji', content: '😄', category: 'emotions' },
  { id: 'love', name: 'Love', type: 'emoji', content: '😍', category: 'emotions' },
  { id: 'sad', name: 'Sad', type: 'emoji', content: '😢', category: 'emotions' },
  { id: 'angry', name: 'Angry', type: 'emoji', content: '😠', category: 'emotions' },
  { id: 'shocked', name: 'Shocked', type: 'emoji', content: '😲', category: 'emotions' },
  { id: 'thinking', name: 'Thinking', type: 'emoji', content: '🤔', category: 'emotions' },
  { id: 'cool', name: 'Cool', type: 'emoji', content: '😎', category: 'emotions' },
  { id: 'cry', name: 'Cry', type: 'emoji', content: '😭', category: 'emotions' },
  
  // Emoji Stickers - Category: Hands
  { id: 'thumbsup', name: 'Thumbs Up', type: 'emoji', content: '👍', category: 'hands' },
  { id: 'thumbsdown', name: 'Thumbs Down', type: 'emoji', content: '👎', category: 'hands' },
  { id: 'clap', name: 'Clap', type: 'emoji', content: '👏', category: 'hands' },
  { id: 'wave', name: 'Wave', type: 'emoji', content: '👋', category: 'hands' },
  { id: 'pray', name: 'Pray', type: 'emoji', content: '🙏', category: 'hands' },
  { id: 'facepalm', name: 'Facepalm', type: 'emoji', content: '🤦', category: 'hands' },
  
  // Emoji Stickers - Category: Animals
  { id: 'dog', name: 'Dog', type: 'emoji', content: '🐶', category: 'animals' },
  { id: 'cat', name: 'Cat', type: 'emoji', content: '🐱', category: 'animals' },
  { id: 'monkey', name: 'Monkey', type: 'emoji', content: '🐵', category: 'animals' },
  { id: 'penguin', name: 'Penguin', type: 'emoji', content: '🐧', category: 'animals' },
  { id: 'unicorn', name: 'Unicorn', type: 'emoji', content: '🦄', category: 'animals' },
  
  // Emoji Stickers - Category: Objects
  { id: 'fire', name: 'Fire', type: 'emoji', content: '🔥', category: 'objects' },
  { id: 'bomb', name: 'Bomb', type: 'emoji', content: '💣', category: 'objects' },
  { id: 'gift', name: 'Gift', type: 'emoji', content: '🎁', category: 'objects' },
  { id: 'party', name: 'Party', type: 'emoji', content: '🎉', category: 'objects' },
  { id: 'star', name: 'Star', type: 'emoji', content: '⭐', category: 'objects' },
  { id: 'moon', name: 'Moon', type: 'emoji', content: '🌙', category: 'objects' },
]

/**
 * Get all sticker categories
 */
export function getStickerCategories(): string[] {
  const categories = new Set([
    ...STICKERS.map(s => s.category),
    'custom'
  ])
  return Array.from(categories).sort()
}

/**
 * Get stickers by category
 */
export function getStickersByCategory(category: string): Sticker[] {
  if (category === 'custom') {
    return getCustomStickers()
  }
  return STICKERS.filter(s => s.category === category)
}

/**
 * Get all custom stickers from localStorage
 */
export function getCustomStickers(): CustomSticker[] {
  try {
    const stored = localStorage.getItem(CUSTOM_STICKERS_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (err) {
    console.error('[Stickers] Error loading custom stickers:', err)
    return []
  }
}

/**
 * Save custom sticker to localStorage
 */
export function saveCustomSticker(file: File, dataUrl: string): CustomSticker {
  const customStickers = getCustomStickers()
  
  // Generate unique ID based on timestamp
  const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const customSticker: CustomSticker = {
    id,
    name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    type: 'image',
    content: dataUrl,
    category: 'custom',
    uploadedAt: Date.now()
  }
  
  customStickers.push(customSticker)
  
  try {
    localStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(customStickers))
    console.log('[Stickers] Custom sticker saved:', id)
    return customSticker
  } catch (err) {
    console.error('[Stickers] Error saving custom sticker:', err)
    throw err
  }
}

/**
 * Delete custom sticker from localStorage
 */
export function deleteCustomSticker(id: string): boolean {
  const customStickers = getCustomStickers()
  const filtered = customStickers.filter(s => s.id !== id)
  
  if (filtered.length === customStickers.length) {
    return false // Sticker not found
  }
  
  try {
    localStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(filtered))
    console.log('[Stickers] Custom sticker deleted:', id)
    return true
  } catch (err) {
    console.error('[Stickers] Error deleting custom sticker:', err)
    return false
  }
}

/**
 * Check if text is a sticker message
 * Format: [STIKER:id]
 */
export function isStickerMessage(text: string): boolean {
  return /^\[STIKER:[a-z0-9_]+\]$/.test(text.trim())
}

/**
 * Extract sticker ID from message
 */
export function extractStickerId(text: string): string | null {
  const match = text.trim().match(/^\[STIKER:([a-z0-9_]+)\]$/)
  return match ? match[1] : null
}

/**
 * Format message as sticker
 */
export function formatAsSticker(stickerId: string): string {
  if (!getStickerById(stickerId)) {
    return '' // Invalid sticker ID
  }
  return `[STIKER:${stickerId}]`
}

/**
 * Cache for shared custom stickers from Firestore
 */
const sharedStickerCache = new Map<string, Sticker>()

/**
 * Save custom sticker with Firestore sync (for sharing across users)
 * @param file The image file
 * @param dataUrl The compressed image data URL
 * @param userId Current user ID
 * @returns The custom sticker
 */
export async function saveCustomStickerWithSync(
  file: File,
  dataUrl: string,
  userId: string
): Promise<CustomSticker> {
  // Save to localStorage first
  const customSticker = saveCustomSticker(file, dataUrl)
  console.log('[Stickers] Custom sticker saved locally:', customSticker.id, '| User:', userId)
  
  // Try to upload to Firestore for sharing with other users
  try {
    const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore')
    
    const firestore = getFirestore()
    const stickersRef = collection(firestore, 'custom_stickers')
    
    const docRef = await addDoc(stickersRef, {
      id: customSticker.id,
      name: customSticker.name,
      imageDataUrl: dataUrl, // Store as data URL for now
      userId: userId,
      uploadedAt: serverTimestamp(),
      category: 'custom'
    })
    
    console.log('[Stickers] ✅ Custom sticker synced to Firestore:', {
      id: customSticker.id,
      firestoreDocId: docRef.id,
      userId: userId
    })
  } catch (err) {
    console.error('[Stickers] ❌ Error syncing custom sticker to Firestore:', {
      id: customSticker.id,
      userId: userId,
      error: err instanceof Error ? err.message : String(err)
    })
    // Still return the sticker even if sync fails - it will work locally
  }
  
  return customSticker
}

/**
 * Get sticker by ID - checks built-in, local custom, and Firestore
 * @param id Sticker ID
 * @returns Sticker or null if not found
 */
export function getStickerById(id: string): Sticker | null {
  // Check built-in stickers first
  const builtin = STICKERS.find(s => s.id === id)
  if (builtin) return builtin
  
  // Check local custom stickers
  const local = getCustomStickers().find(s => s.id === id)
  if (local) return local
  
  // Check shared cache (from Firestore)
  const cached = sharedStickerCache.get(id)
  if (cached) return cached
  
  return null
}

/**
 * Fetch custom sticker from Firestore (async)
 * Used when a sticker is not found locally
 */
export async function fetchCustomStickerFromFirestore(id: string): Promise<Sticker | null> {
  try {
    // Check cache first
    if (sharedStickerCache.has(id)) {
      console.log('[Stickers] Sticker found in cache:', id)
      return sharedStickerCache.get(id) || null
    }
    
    console.log('[Stickers] Fetching custom sticker from Firestore:', id)
    const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore')
    
    const firestore = getFirestore()
    const stickersRef = collection(firestore, 'custom_stickers')
    const q = query(stickersRef, where('id', '==', id))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      console.warn('[Stickers] ⚠️ Custom sticker not found in Firestore:', id)
      return null
    }
    
    const doc = snapshot.docs[0]
    const data = doc.data()
    
    const sticker: Sticker = {
      id: data.id,
      name: data.name,
      type: 'image',
      content: data.imageDataUrl,
      category: 'custom'
    }
    
    // Cache it
    sharedStickerCache.set(id, sticker)
    console.log('[Stickers] ✅ Custom sticker fetched from Firestore:', {
      id: id,
      name: data.name,
      uploadedBy: data.userId
    })
    
    return sticker
  } catch (err) {
    console.error('[Stickers] ❌ Error fetching custom sticker from Firestore:', {
      id: id,
      error: err instanceof Error ? err.message : String(err)
    })
    return null
  }
}
