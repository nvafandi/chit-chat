/**
 * File Cleanup Service
 * Handles checking file availability and syncing message state with file existence
 */

import { supabase } from './supabase'
import { isFileExpired, cleanupExpiredFileMetadata, getFileMetadata } from '@/utils/fileExpiration'
import { hideMessage, cleanExpiredMessages, isFileUsedByPinnedMessage } from './firebase'
import { SUPABASE_BUCKET_NAME, ENABLE_AGGRESSIVE_FILE_DELETION, FILE_EXPIRATION_TIME, IMAGE_EXPIRATION_TIME } from '@/utils/const'
import type { Message } from '@/types'

/**
 * Check if a file URL is accessible in Supabase
 * @param fileUrl - Public URL of the file
 * @returns true if file exists and is accessible, false otherwise
 */
export async function isFileAccessible(fileUrl: string): Promise<boolean> {
  try {
    if (!fileUrl || fileUrl.trim() === '') {
      return false
    }

    // First check if file has expired locally
    if (isFileExpired(fileUrl)) {
      console.log('⏰ File has locally expired:', fileUrl)
      return false
    }

    // Try to fetch the file to see if it's still accessible
    const response = await fetch(fileUrl, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    console.warn('❌ File not accessible:', fileUrl, error)
    return false
  }
}

/**
 * Check all messages for files that are no longer accessible
 * and hide messages that reference missing files
 * @param messages - Array of messages to check
 * @returns Count of messages that were hidden due to missing files
 */
export async function syncMessagesWithFileAvailability(messages: Message[]): Promise<number> {
  let hiddenCount = 0

  try {
    console.log('🔄 Starting file availability sync for', messages.length, 'messages')

    for (const message of messages) {
      // Skip if already hidden
      if (message.hidden) {
        continue
      }

      let fileToCheck: string | undefined

      // Check image URL
      if (message.imageUrl) {
        fileToCheck = message.imageUrl
      }
      // Check file URL
      else if (message.fileUrl) {
        fileToCheck = message.fileUrl
      }

      // If message has a file, check if it's still accessible
      if (fileToCheck) {
        const isAccessible = await isFileAccessible(fileToCheck)

        if (!isAccessible) {
          console.log('📛 File not accessible for message:', message.id, 'hiding message...')
          try {
            await hideMessage(message.id)
            hiddenCount++
          } catch (error) {
            console.error('Error hiding message:', message.id, error)
          }
        }
      }
    }

    if (hiddenCount > 0) {
      console.log(`📛 Hidden ${hiddenCount} messages due to missing files`)
    }

    return hiddenCount
  } catch (error) {
    console.error('Error syncing message availability:', error)
    return 0
  }
}

/**
 * Perform complete file cleanup routine:
 * 1. Clean up expired file metadata from localStorage
 * 2. Check all messages for file availability
 * 3. Delete expired files from Supabase Storage
 * @param messages - Array of messages to verify
 * @returns Object with cleanup statistics
 */
// export async function performFileCleanup(messages: Message[]): Promise<{
export async function performFileCleanup(messages: Message[]): Promise<{
  metadataCleanedUp: boolean
  filesDeleted: number
  messagesDeleted: number
}> {
  try {
    console.log('🧹 Starting complete cleanup routine...')

    // Clean up expired metadata
    cleanupExpiredFileMetadata()

    // Sync messages with file availability
    const messagesHidden = await syncMessagesWithFileAvailability(messages)

    // Delete expired files from Supabase Storage
    let filesDeleted = 0
    if (ENABLE_AGGRESSIVE_FILE_DELETION) {
      console.log('🗑️  Attempting to delete expired files from Supabase Storage...')
      filesDeleted = await deleteExpiredFilesFromStorage()
    }

    // Delete messages older than 1 week
    let messagesDeleted = 0
    try {
      messagesDeleted = await cleanExpiredMessages()
    } catch (error) {
      console.error('⚠️ Error cleaning expired messages:', error)
    }

    console.log('✅ Cleanup routine completed', { filesDeleted, messagesHidden, messagesDeleted })
    
    return {
      metadataCleanedUp: true,
      filesDeleted,
      messagesDeleted,
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    return {
      metadataCleanedUp: false,
      filesDeleted: 0,
      messagesDeleted: 0,
    }
  }
}

/**
 * Monitor file expiration and delete expired files from Supabase Storage
 * Deletes files that are older than FILE_EXPIRATION_TIME
 */
export async function deleteExpiredFilesFromStorage(bucket: string = SUPABASE_BUCKET_NAME): Promise<number> {
  let deletedCount = 0

  try {
    console.log('🔍 Checking for expired files in Supabase storage...')

    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list('public/', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'asc' },
      })

    if (listError) {
      console.error('❌ Error listing files:', listError)
      return 0
    }

    if (!files || files.length === 0) {
      console.log('📭 No files found in storage')
      return 0
    }

    console.log(`📂 Found ${files.length} files in storage (Image: ${IMAGE_EXPIRATION_TIME / 1000}s, File: ${FILE_EXPIRATION_TIME / 1000}s)`)

    // Check each file for expiration
    for (const file of files) {
      // Get file metadata from creation time
      if (!file.created_at) {
        console.warn(`⚠️  Skipping file ${file.name} - no creation date`)
        continue
      }

      const createdAt = new Date(file.created_at).getTime()
      const now = Date.now()
      const fileAgeMs = now - createdAt
      const fileAgeSeconds = Math.floor(fileAgeMs / 1000)

      // Try to find metadata in localStorage to determine file type
      const fileUrl = `${supabase.storage.from(bucket).getPublicUrl(`public/${file.name}`).data.publicUrl}`
      const metadata = getFileMetadata(fileUrl)
      
      const isImage = metadata?.isImage ?? false
      const expirationTimeMs = isImage ? IMAGE_EXPIRATION_TIME : FILE_EXPIRATION_TIME
      const typeLabel = isImage ? '🖼️ Image' : '📄 File'
      const expirationSeconds = expirationTimeMs / 1000

      console.log(`${typeLabel}: ${file.name} (age: ${fileAgeSeconds}s, expiration: ${expirationSeconds}s)`)

      if (fileAgeMs > expirationTimeMs) {
        console.log(`⏰ ${typeLabel} EXPIRED: ${file.name} (age: ${fileAgeSeconds}s > ${expirationSeconds}s)`)

        // Check if file is used by a pinned message
        const isPinned = await isFileUsedByPinnedMessage(fileUrl)
        if (isPinned) {
          console.log(`📌 ${typeLabel} SKIPPED (used by pinned message): ${file.name}`)
          continue
        }

        try {
          const filePath = `public/${file.name}`
          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove([filePath])

          if (deleteError) {
            console.error(`❌ Failed to delete ${file.name}:`, deleteError)
          } else {
            console.log(`✅ DELETED expired ${typeLabel.toLowerCase()}: ${file.name}`)
            deletedCount++
          }
        } catch (error) {
          console.error(`❌ Error deleting file ${file.name}:`, error)
        }
      } else {
        const timeRemaining = (expirationTimeMs - fileAgeMs) / 1000
        console.log(`⏳ ${typeLabel} NOT expired yet: ${file.name} (${timeRemaining.toFixed(1)}s remaining)`)
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} expired files from storage`)
    } else {
      console.log(`✅ No expired files to delete`)
    }

    return deletedCount
  } catch (error) {
    console.error('❌ Error deleting expired files:', error)
    return 0
  }
}

/**
 * Schedule periodic cleanup (simulated with setInterval)
 * This runs the cleanup routine every hour
 * @param messages - Function to get current messages
 * @param interval - Interval in milliseconds (default: 1 hour)
 * @returns Function to stop the scheduled cleanup
 */
export function schedulePeriodicCleanup(
  getMessagesCallback: () => Message[],
  interval: number = 60 * 60 * 1000 // 1 hour
): () => void {
  console.log('⏰ Scheduling periodic file cleanup every', interval / 1000 / 60, 'minutes')

  const intervalId = setInterval(async () => {
    try {
      const messages = getMessagesCallback()
      await performFileCleanup(messages)
    } catch (error) {
      console.error('Error in scheduled cleanup:', error)
    }
  }, interval)

  // Return function to stop the cleanup
  return () => {
    clearInterval(intervalId)
    console.log('⏹ Stopped periodic file cleanup')
  }
}
