/**
 * Sticker System - React Native version
 * Built-in emoji stickers identical to web (cross-platform compatible IDs).
 * Custom image stickers are resolved via embedded stickerData or Firestore.
 */

export interface Sticker {
  id: string
  name: string
  type: 'emoji' | 'image'
  content: string // emoji char or image data URL / remote URL
  category: string
}

export const STICKERS: Sticker[] = [
  // Emotions
  { id: 'laugh', name: 'Laugh', type: 'emoji', content: '😄', category: 'emotions' },
  { id: 'love', name: 'Love', type: 'emoji', content: '😍', category: 'emotions' },
  { id: 'sad', name: 'Sad', type: 'emoji', content: '😢', category: 'emotions' },
  { id: 'angry', name: 'Angry', type: 'emoji', content: '😠', category: 'emotions' },
  { id: 'shocked', name: 'Shocked', type: 'emoji', content: '😲', category: 'emotions' },
  { id: 'thinking', name: 'Thinking', type: 'emoji', content: '🤔', category: 'emotions' },
  { id: 'cool', name: 'Cool', type: 'emoji', content: '😎', category: 'emotions' },
  { id: 'cry', name: 'Cry', type: 'emoji', content: '😭', category: 'emotions' },
  // Hands
  { id: 'thumbsup', name: 'Thumbs Up', type: 'emoji', content: '👍', category: 'hands' },
  { id: 'thumbsdown', name: 'Thumbs Down', type: 'emoji', content: '👎', category: 'hands' },
  { id: 'clap', name: 'Clap', type: 'emoji', content: '👏', category: 'hands' },
  { id: 'wave', name: 'Wave', type: 'emoji', content: '👋', category: 'hands' },
  { id: 'pray', name: 'Pray', type: 'emoji', content: '🙏', category: 'hands' },
  { id: 'facepalm', name: 'Facepalm', type: 'emoji', content: '🤦', category: 'hands' },
  // Animals
  { id: 'dog', name: 'Dog', type: 'emoji', content: '🐶', category: 'animals' },
  { id: 'cat', name: 'Cat', type: 'emoji', content: '🐱', category: 'animals' },
  { id: 'monkey', name: 'Monkey', type: 'emoji', content: '🐵', category: 'animals' },
  { id: 'penguin', name: 'Penguin', type: 'emoji', content: '🐧', category: 'animals' },
  { id: 'unicorn', name: 'Unicorn', type: 'emoji', content: '🦄', category: 'animals' },
  // Objects
  { id: 'fire', name: 'Fire', type: 'emoji', content: '🔥', category: 'objects' },
  { id: 'bomb', name: 'Bomb', type: 'emoji', content: '💣', category: 'objects' },
  { id: 'gift', name: 'Gift', type: 'emoji', content: '🎁', category: 'objects' },
  { id: 'party', name: 'Party', type: 'emoji', content: '🎉', category: 'objects' },
  { id: 'star', name: 'Star', type: 'emoji', content: '⭐', category: 'objects' },
  { id: 'moon', name: 'Moon', type: 'emoji', content: '🌙', category: 'objects' },
]

export function getStickerCategories(): string[] {
  return ['animals', 'emotions', 'hands', 'objects']
}

export function getStickersByCategory(category: string): Sticker[] {
  return STICKERS.filter((s) => s.category === category)
}

/**
 * Check if text is a sticker message. Format: [STIKER:id]
 */
export function isStickerMessage(text: string): boolean {
  return /^\[STIKER:[a-z0-9_]+\]$/.test(text.trim())
}

/**
 * Extract sticker ID from message text.
 */
export function extractStickerId(text: string): string | null {
  const match = text.trim().match(/^\[STIKER:([a-z0-9_]+)\]$/)
  return match ? match[1] : null
}

/**
 * Format message content as a sticker reference.
 */
export function formatAsSticker(stickerId: string): string {
  if (!STICKERS.some((s) => s.id === stickerId)) {
    throw new Error(`Unknown sticker: ${stickerId}`)
  }
  return `[STIKER:${stickerId}]`
}

/** Cache for shared custom stickers fetched from Firestore */
const sharedStickerCache = new Map<string, Sticker>()

export function getBuiltinStickerById(id: string): Sticker | null {
  return STICKERS.find((s) => s.id === id) ?? null
}

/**
 * Fetch a custom (image) sticker from Firestore when not available inline.
 * Mirrors web behaviour so custom stickers sent from web render on mobile.
 */
export async function fetchCustomStickerFromFirestore(id: string): Promise<Sticker | null> {
  try {
    if (sharedStickerCache.has(id)) {
      return sharedStickerCache.get(id) ?? null
    }

    const { getFirestore, collection, query, where, getDocs } = await import(
      'firebase/firestore'
    )
    const firestore = getFirestore()
    const q = query(collection(firestore, 'custom_stickers'), where('id', '==', id))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const data = snapshot.docs[0].data()
    const sticker: Sticker = {
      id: data.id,
      name: data.name,
      type: 'image',
      content: data.imageDataUrl,
      category: 'custom',
    }
    sharedStickerCache.set(id, sticker)
    return sticker
  } catch (err) {
    console.warn('[Stickers] Firestore fetch failed:', err)
    return null
  }
}
