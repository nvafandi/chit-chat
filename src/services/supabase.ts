import { createClient } from '@supabase/supabase-js'
import { storeFileMetadata } from '@/utils/fileExpiration'
import { SUPABASE_URL, SUPABASE_ANON_KEY, CACHE_CONTROL_DURATION } from '@/utils/const'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase credentials not configured. Please update SUPABASE_URL and SUPABASE_ANON_KEY in src/utils/const.ts'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/**
 * Upload file to Supabase Storage (supports any file type)
 * @param file - File blob (image or other)
 * @param filename - Name of the file
 * @param bucket - Supabase bucket name (default: 'chat-images')
 * @param onProgress - Optional callback to track upload progress (0-100)
 * @returns Promise with public URL or null if upload fails
 */
export async function uploadFile(
  file: Blob,
  filename: string,
  bucket: string = 'chat-images',
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    // Create a unique filename to avoid conflicts
    const timestamp = Date.now()
    const fileExtension = filename.split('.').pop() || 'file'
    const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`
    const filePath = `public/${uniqueFilename}`

    console.log('📤 Uploading file:', { filename, uniqueFilename, filePath, size: file.size })

    // Simulate progress with intervals (Supabase JS SDK doesn't expose raw progress events)
    let progress = 0
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.random() * 30
        if (progress > 90) progress = 90
        onProgress?.(Math.round(progress))
      }
    }, 200)

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: CACHE_CONTROL_DURATION,
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })

    clearInterval(progressInterval)
    onProgress?.(100)

    if (error) {
      console.error('❌ Error uploading file:', {
        message: error.message,
        statusCode: error.statusCode,
        status: error.status,
        fullError: error
      })
      console.error('📝 Details:', JSON.stringify(error, null, 2))
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    console.log('✅ File uploaded successfully:', publicUrlData.publicUrl)
    
    // Store file metadata for expiration tracking (pass MIME type)
    storeFileMetadata(publicUrlData.publicUrl, Date.now(), filename, file.type)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Upload file error:', error)
    return null
  }
}

/**
 * Upload compressed image to Supabase Storage (deprecated - use uploadFile instead)
 * @param file - Compressed file blob
 * @param filename - Name of the file
 * @param bucket - Supabase bucket name (default: 'chat-images')
 * @param onProgress - Optional callback to track upload progress (0-100)
 * @returns Promise with public URL or null if upload fails
 */
export async function uploadImage(
  file: Blob,
  filename: string,
  bucket: string = 'chat-images',
  onProgress?: (progress: number) => void
): Promise<string | null> {
  try {
    // Create a unique filename to avoid conflicts
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}-${filename}`
    const filePath = `public/${uniqueFilename}`

    // Simulate progress with intervals (Supabase JS SDK doesn't expose raw progress events)
    let progress = 0
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.random() * 30
        if (progress > 90) progress = 90
        onProgress?.(Math.round(progress))
      }
    }, 200)

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: CACHE_CONTROL_DURATION,
        upsert: false,
        contentType: file.type,
      })

    clearInterval(progressInterval)
    onProgress?.(100)

    if (error) {
      console.error('❌ Error uploading image:', {
        message: error.message,
        statusCode: error.statusCode,
        status: error.status,
        fullError: error
      })
      console.error('📝 Details:', JSON.stringify(error, null, 2))
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    // Store file metadata for expiration tracking (pass MIME type)
    storeFileMetadata(publicUrlData.publicUrl, Date.now(), filename, file.type)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Upload image error:', error)
    return null
  }
}

/**
 * Delete image from Supabase Storage
 * @param imageUrl - Public URL of the image
 * @param bucket - Supabase bucket name (default: 'chat-images')
 */
export async function deleteImage(
  imageUrl: string,
  bucket: string = 'chat-images'
): Promise<boolean> {
  try {
    // Extract filename from URL
    const urlPath = new URL(imageUrl).pathname
    const filename = urlPath.split('/').pop()

    if (!filename) {
      throw new Error('Invalid image URL')
    }

    const filePath = `public/${filename}`

    const { error } = await supabase.storage.from(bucket).remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete image error:', error)
    return false
  }
}

/**
 * Get image info (size, metadata) from Supabase Storage
 * @param imageUrl - Public URL of the image
 * @param bucket - Supabase bucket name (default: 'chat-images')
 */
export async function getImageInfo(
  imageUrl: string
): Promise<{ size: number; metadata: any } | null> {
  try {
    const urlPath = new URL(imageUrl).pathname
    const filename = urlPath.split('/').pop()

    if (!filename) {
      throw new Error('Invalid image URL')
    }

    // Fetch file to get actual size
    const response = await fetch(imageUrl)
    const blob = await response.blob()

    return {
      size: blob.size,
      metadata: {
        url: imageUrl,
        filename: filename
      },
    }
  } catch (error) {
    console.error('Get image info error:', error)
    return null
  }
}

/**
 * Delete all messages from Supabase database
 */
export async function cleanMessages(): Promise<void> {
  try {
    console.log('🗑️ Deleting ALL messages from Supabase...')
    
    // Check if the table is empty first
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error checking message count:', countError)
      throw countError
    }

    if (count === 0) {
      console.log('📭 No messages found to delete')
      return
    }

    console.log(`Attempting to delete ${count} messages...`)
    
    // We try many ways to bypass RLS or bulk delete restrictions
    // Method 1: Try deleting with a "match all" filter
    const { error: directError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (!directError) {
      console.log('✅ All messages deleted via direct filter')
      return
    }

    console.warn('⚠️ Direct delete unsuccessful, trying ID-based chunking...', directError)

    // Method 2: Fetch IDs and delete in small chunks
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id')
    
    if (fetchError) throw fetchError

    if (messages && messages.length > 0) {
      const messageIds = messages.map(m => m.id)
      const chunkSize = 20 // Smaller chunks for better reliability
      for (let i = 0; i < messageIds.length; i += chunkSize) {
        const chunk = messageIds.slice(i, i + chunkSize)
        const { error: chunkError } = await supabase
          .from('messages')
          .delete()
          .in('id', chunk)
        
        if (chunkError) {
          console.error(`❌ Message chunk ${i / chunkSize + 1} failed:`, chunkError)
          throw chunkError
        }
      }
    }

    console.log('✅ All messages deleted successfully')
  } catch (error: any) {
    // Return a readable error message instead of letting it be caught as "Unknown error"
    const finalMessage = error?.message || error?.details || JSON.stringify(error)
    console.error('❌ Detailed Error during message cleanup:', finalMessage)
    throw new Error(finalMessage)
  }
}

/**
 * Delete all users from Supabase database
 */
export async function cleanUsers(): Promise<void> {
  try {
    console.log('🗑️ Deleting ALL users from Supabase...')
    
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
    
    if (fetchError) throw fetchError

    if (!users || users.length === 0) {
      console.log('📭 No users found to delete')
      return
    }

    console.log(`Attempting to delete ${users.length} users...`)
    
    // Try direct delete first
    const { error: directError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (!directError) {
      console.log('✅ All users deleted via direct filter')
      return
    }

    // Fallback to chunks
    const userIds = users.map(u => u.id)
    const chunkSize = 20
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize)
      const { error: chunkError } = await supabase
        .from('users')
        .delete()
        .in('id', chunk)
      
      if (chunkError) throw chunkError
    }

    console.log('✅ All users deleted successfully')
  } catch (error: any) {
    const finalMessage = error?.message || error?.details || JSON.stringify(error)
    console.error('❌ Detailed Error during user cleanup:', finalMessage)
    throw new Error(finalMessage)
  }
}

/**
 * Delete all files from Supabase Storage
 */
export async function cleanAllStorage(bucket: string = 'chat-images'): Promise<void> {
  try {
    console.log('🗑️  Deleting all files from Supabase Storage...')
    
    // List all files
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list('public/', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      })
    
    if (listError) {
      console.error('Error listing files:', listError)
      throw listError
    }

    if (!files || files.length === 0) {
      console.log('📭 No files found in storage')
      return
    }

    // Build list of file paths to delete
    const filePaths = files
      .filter(file => !file.name.startsWith('.'))
      .map(file => `public/${file.name}`)

    if (filePaths.length === 0) {
      console.log('📭 No valid files to delete')
      return
    }

    // Delete all files
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove(filePaths)

    if (deleteError) {
      console.error('Error deleting files:', deleteError)
      throw deleteError
    }

    console.log(`✅ Deleted ${filePaths.length} files from storage`)
  } catch (error) {
    console.error('❌ Error cleaning storage:', error)
    throw error
  }
}
