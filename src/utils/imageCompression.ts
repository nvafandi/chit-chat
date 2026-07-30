/**
 * Image compression utility using Canvas API
 * Provides maximum compression while maintaining quality
 */

import { MAX_UPLOAD_FILE_SIZE } from '@/utils/const'

export interface CompressionOptions {
  maxWidth?: number       // Default: 1920px
  maxHeight?: number      // Default: 1920px
  quality?: number        // Default: 0.7 (70%) - higher = better quality but larger file
  format?: 'jpeg' | 'webp' | 'png'  // Default: 'jpeg'
}

export interface CompressionResult {
  blob: Blob
  originalSize: number
  compressedSize: number
  compressionRatio: number // percentage saved
  originalWidth: number
  originalHeight: number
  compressedWidth: number
  compressedHeight: number
}

/**
 * Compress image dengan maximum compression untuk mengurangi storage usage
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns CompressionResult with compression details
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.7,  // 70% quality untuk hasil terbaik antara ukuran dan kualitas
    format = 'jpeg',
  } = options

  const originalSize = file.size

  // Read original image
  const originalImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

  const originalWidth = originalImage.width
  const originalHeight = originalImage.height

  // Calculate new dimensions (maintain aspect ratio)
  let newWidth = originalWidth
  let newHeight = originalHeight

  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    const aspectRatio = originalWidth / originalHeight

    if (originalWidth > maxWidth) {
      newWidth = maxWidth
      newHeight = maxWidth / aspectRatio
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight
      newWidth = maxHeight * aspectRatio
    }
  }

  // Create canvas and draw compressed image
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(newWidth)
  canvas.height = Math.round(newHeight)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Draw image on canvas (this applies compression)
  ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height)

  // Convert to blob
  const compressedBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          throw new Error('Failed to create blob')
        }
        resolve(blob)
      },
      `image/${format}`,
      quality
    )
  })

  const compressedSize = compressedBlob.size
  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100

  return {
    blob: compressedBlob,
    originalSize,
    compressedSize,
    compressionRatio,
    originalWidth,
    originalHeight,
    compressedWidth: canvas.width,
    compressedHeight: canvas.height,
  }
}

/**
 * Compress image untuk maksimal reduction (quality 0.6)
 * Gunakan ini jika ukuran file sangat penting
 */
export async function compressImageMaximum(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.6,  // 60% quality untuk compression maksimal
    format: 'jpeg',
  })
}

/**
 * Compress image dengan balanced settings (quality 0.75)
 * Gunakan ini untuk hasil terbaik antara kualitas dan ukuran
 */
export async function compressImageBalanced(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.75,  // 75% quality untuk balance
    format: 'jpeg',
  })
}

/**
 * Check apakah file adalah image yang bisa dikompres
 */
export function isCompressibleImage(file: File): boolean {
  const compressibleTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
  return compressibleTypes.includes(file.type)
}

/**
 * Check apakah file adalah image (semua tipe)
 */
export function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Validate file untuk upload (bisa image atau file lain)
 */
export function validateFileForUpload(file: File): { valid: boolean; error?: string; isImage: boolean } {
  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return {
      valid: false,
      isImage: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(MAX_UPLOAD_FILE_SIZE)})`,
    }
  }

  const imageFile = isImage(file)
  
  if (!imageFile) {
    // File bukan image, tapi masih allow upload
    return { valid: true, isImage: false }
  }

  // Validate image file
  const imageValidation = validateImageFile(file)
  return { ...imageValidation, isImage: true }
}
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB max before compression

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (50MB)`,
    }
  }

  // Support semua format image yang umum
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/tiff'
  ]
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not supported. Supported: JPG, PNG, WebP, GIF, BMP, SVG, TIFF` }
  }

  return { valid: true }
}

/**
 * Format file size untuk display (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
