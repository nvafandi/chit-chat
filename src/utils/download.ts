import { isChunkedManifestUrl, resolveChunkedFile } from '@/services/supabase'

/**
 * Download an attachment. Chunked manifests (>50MB uploads) are
 * reassembled in-memory before saving.
 */
export async function downloadAttachment(url: string, filename: string): Promise<void> {
  let blob: Blob

  if (isChunkedManifestUrl(url)) {
    const resolved = await resolveChunkedFile(url)
    if (!resolved?.blob) throw new Error('File tidak ditemukan')
    blob = resolved.blob
  } else {
    const res = await fetch(url)
    if (res.status === 404) {
      throw new Error('File sudah kedaluwarsa (masa simpan 24 jam) dan telah dihapus.')
    }
    if (!res.ok) throw new Error(`Gagal mengunduh (HTTP ${res.status})`)
    blob = await res.blob()
  }

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
}
