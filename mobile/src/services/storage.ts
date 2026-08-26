import * as FileSystem from 'expo-file-system/legacy'
import * as ImageManipulator from 'expo-image-manipulator'
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BUCKET_NAME } from '@/utils/const'

export interface UploadResult {
  url: string
  size: number
}

const MAX_FILE_SIZE = 45 * 1024 * 1024 // keep under Supabase single-object limit
const MAX_IMAGE_DIMENSION = 1920

function buildPath(fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : 'bin'
  return `public/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
}

function publicUrl(path: string): string {
  // path already contains "public/..." prefix
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET_NAME}/${path}`
}

/**
 * Compress large images before upload (resize + JPEG re-encode).
 */
async function compressImage(
  uri: string
): Promise<{ uri: string; size: number }> {
  const info = await FileSystem.getInfoAsync(uri)
  const size = 'size' in info && info.size ? info.size : 0

  if (size > 0 && size < 300 * 1024) {
    return { uri, size } // small enough, skip compression
  }

  try {
    const actions = [{ resize: { width: MAX_IMAGE_DIMENSION } }]
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    })
    const newInfo = await FileSystem.getInfoAsync(result.uri)
    const newSize = 'size' in newInfo && newInfo.size ? newInfo.size : 0
    if (newSize > 0 && newSize < size) {
      return { uri: result.uri, size: newSize }
    }
    return { uri, size }
  } catch {
    return { uri, size }
  }
}

/**
 * Upload any file from a local URI to Supabase Storage.
 */
export async function uploadFromUri(
  uri: string,
  fileName: string,
  mimeType: string,
  isImage: boolean
): Promise<UploadResult> {
  let finalUri = uri
  let size = 0

  if (isImage) {
    const compressed = await compressImage(uri)
    finalUri = compressed.uri
    size = compressed.size
  }

  if (!size) {
    const info = await FileSystem.getInfoAsync(finalUri)
    size = 'size' in info && info.size ? info.size : 0
  }

  if (size > MAX_FILE_SIZE) {
    throw new Error(`Ukuran file ${(size / 1024 / 1024).toFixed(1)}MB melebihi batas 45MB`)
  }

  const path = buildPath(isImage ? fileName.replace(/\.\w+$/, '') + '.jpg' : fileName)
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET_NAME}/${path}`

  const res = await FileSystem.uploadAsync(uploadUrl, finalUri, {
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: isImage ? 'image/jpeg' : mimeType || 'application/octet-stream',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'x-upsert': 'false',
    },
  })

  if (res.status >= 400) {
    throw new Error(`Upload gagal (HTTP ${res.status})`)
  }

  return { url: publicUrl(path), size }
}

export function isImageMime(mimeType?: string): boolean {
  return !!mimeType?.startsWith('image/')
}
