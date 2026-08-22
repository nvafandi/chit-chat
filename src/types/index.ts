export interface User {
  id: string
  username: string
  password: string // Note: In production, this should be hashed
  animal: string
  createdAt: number
}

export interface ReplyTo {
  id: string
  username: string
  animal: string
  content: string
}

export interface Attachment {
  id: string             // Unique attachment ID
  url: string            // URL of uploaded file
  type: 'image' | 'file' // Type of attachment
  mimeType: string       // MIME type (e.g., 'image/png', 'application/pdf')
  name: string           // Original filename
  size: number           // File size in bytes
  originalSize?: number  // Original size before compression (for images)
  compressedSize?: number // Compressed size (for images)
}

export interface Message {
  id: string
  userId: string
  username: string
  animal?: string
  content: string
  timestamp: number
  replyTo?: ReplyTo
  hidden?: boolean
  pinned?: boolean      // Pin status
  pinnedAt?: number     // Timestamp when pinned
  pinnedBy?: string     // Username who pinned
  // Support for both old single-file format and new attachments array
  imageUrl?: string      // URL of uploaded image (legacy)
  imageSize?: number     // Size of compressed image in bytes (legacy)
  originalImageSize?: number  // Original image size before compression (legacy)
  imageName?: string     // Original image filename (legacy)
  // Generic file support (legacy)
  fileUrl?: string       // URL of uploaded file (legacy)
  fileSize?: number      // Size of file (legacy)
  originalFileSize?: number  // Original file size (legacy)
  fileName?: string      // Original file name (legacy)
  fileType?: string      // File MIME type (legacy)
  // New multi-file support
  attachments?: Attachment[]  // Array of attachments (new way)
  replyCount?: number    // Number of replies to this message
  // Sticker data (embedded in message for reliability)
  stickerData?: {
    id: string           // Sticker ID
    type: 'emoji' | 'image'  // Type of sticker
    content: string      // Emoji char or image data URL
    name: string         // Sticker name
  }
  // Shared location data
  location?: {
    latitude: number     // Latitude coordinate
    longitude: number    // Longitude coordinate
    label?: string       // Optional human-readable address/label
  }
}

export interface SessionData {
  username: string
  userId: string
  animal: string
  password: string
}
