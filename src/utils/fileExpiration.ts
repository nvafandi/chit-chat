/**
 * File Expiration Utility
 * Handles tracking and cleanup of files that expire after specific time based on file type
 */

import { FILE_EXPIRATION_TIME, IMAGE_EXPIRATION_TIME, FILE_METADATA_PREFIX, ALLOWED_IMAGE_TYPES } from './const'

/**
 * Determine if a file is an image based on MIME type
 * @param fileType - MIME type of the file
 * @returns true if file is an image
 */
function isImageFile(fileType?: string): boolean {
  if (!fileType) return false
  return ALLOWED_IMAGE_TYPES.includes(fileType)
}

/**
 * Get the appropriate expiration time based on file type
 * @param fileType - MIME type of the file
 * @returns Expiration time in milliseconds
 */
function getExpirationTimeByType(fileType?: string): number {
  return isImageFile(fileType) ? IMAGE_EXPIRATION_TIME : FILE_EXPIRATION_TIME
}

/**
 * Store file metadata in localStorage to track expiration
 * @param fileUrl - Public URL of the uploaded file
 * @param uploadTime - Timestamp when file was uploaded
 * @param fileName - Original file name
 * @param fileType - MIME type of the file (e.g., 'image/jpeg', 'application/pdf')
 */
export function storeFileMetadata(
  fileUrl: string,
  uploadTime: number,
  fileName: string,
  fileType?: string
): void {
  try {
    const expirationTime = uploadTime + getExpirationTimeByType(fileType)
    const isImage = isImageFile(fileType)
    
    const metadata = {
      fileUrl,
      uploadTime,
      fileName,
      fileType,
      isImage,
      expirationTime,
      expirationTimeMs: getExpirationTimeByType(fileType),
    }

    // Create storage key from file URL
    const storageKey = `${FILE_METADATA_PREFIX}${getFileIdFromUrl(fileUrl)}`
    localStorage.setItem(storageKey, JSON.stringify(metadata))
    const typeLabel = isImage ? '🖼️ Image' : '📄 File'
    const expirationSeconds = Math.floor(getExpirationTimeByType(fileType) / 1000)
    console.log(`📝 ${typeLabel} metadata stored:`, { fileName, expirationSeconds, expirationTime: new Date(expirationTime) })
  } catch (error) {
    console.error('Error storing file metadata:', error)
  }
}

/**
 * Extract file ID from URL for use as storage key
 * @param fileUrl - Public URL of the file
 * @returns File ID string
 */
export function getFileIdFromUrl(fileUrl: string): string {
  try {
    const urlPath = new URL(fileUrl).pathname
    const filename = urlPath.split('/').pop() || ''
    return filename.replace(/[^a-zA-Z0-9_-]/g, '')
  } catch {
    return Math.random().toString(36).substring(7)
  }
}

/**
 * Check if a file has expired
 * @param fileUrl - Public URL of the file
 * @returns true if file has expired, false otherwise
 */
export function isFileExpired(fileUrl: string): boolean {
  try {
    const storageKey = `${FILE_METADATA_PREFIX}${getFileIdFromUrl(fileUrl)}`
    const metadataStr = localStorage.getItem(storageKey)

    if (!metadataStr) {
      // If no metadata found, assume file might be expired or is external
      return false
    }

    const metadata = JSON.parse(metadataStr)
    const now = Date.now()
    const isExpired = now > metadata.expirationTime

    if (isExpired) {
      const typeLabel = metadata.isImage ? '🖼️ Image' : '📄 File'
      console.log(`⏰ ${typeLabel} has expired:`, metadata.fileName)
    }

    return isExpired
  } catch (error) {
    console.error('Error checking file expiration:', error)
    return false
  }
}

/**
 * Get file metadata
 * @param fileUrl - Public URL of the file
 * @returns File metadata or null if not found
 */
export function getFileMetadata(fileUrl: string) {
  try {
    const storageKey = `${FILE_METADATA_PREFIX}${getFileIdFromUrl(fileUrl)}`
    const metadataStr = localStorage.getItem(storageKey)

    if (!metadataStr) {
      return null
    }

    return JSON.parse(metadataStr)
  } catch (error) {
    console.error('Error getting file metadata:', error)
    return null
  }
}

/**
 * Get time remaining until file expires (in milliseconds)
 * Returns negative number if already expired
 * @param fileUrl - Public URL of the file
 * @returns Milliseconds until expiration, or null if metadata not found
 */
export function getTimeUntilExpiration(fileUrl: string): number | null {
  try {
    const metadata = getFileMetadata(fileUrl)
    if (!metadata) return null

    const timeRemaining = metadata.expirationTime - Date.now()
    return timeRemaining
  } catch (error) {
    console.error('Error calculating expiration time:', error)
    return null
  }
}

/**
 * Format remaining time in a human-readable format
 * @param milliseconds - Time in milliseconds
 * @returns Formatted string like "2 hours" or "30 minutes"
 */
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Clean up expired file metadata from localStorage
 */
export function cleanupExpiredFileMetadata(): void {
  try {
    const now = Date.now()
    let cleanedCount = 0

    // Iterate through all localStorage keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(FILE_METADATA_PREFIX)) continue

      try {
        const metadataStr = localStorage.getItem(key)
        if (!metadataStr) continue

        const metadata = JSON.parse(metadataStr)
        if (now > metadata.expirationTime) {
          localStorage.removeItem(key)
          cleanedCount++
          console.log('🧹 Cleaned up expired file metadata:', metadata.fileName)
        }
      } catch (error) {
        console.error(`Error processing metadata key ${key}:`, error)
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired file metadata entries`)
    }
  } catch (error) {
    console.error('Error cleaning up file metadata:', error)
  }
}
