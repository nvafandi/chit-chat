import { isChunkedManifestUrl, resolveChunkedFile } from '@/services/supabase'

/**
 * Download an attachment. Chunked manifests (>50MB uploads) are
 * reassembled in-memory before saving.
 * @param onProgress - Optional callback reporting download progress (0-100)
 */
export async function downloadAttachment(
  url: string,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  let blob: Blob

  if (isChunkedManifestUrl(url)) {
    const resolved = await resolveChunkedFile(url, onProgress)
    if (!resolved?.blob) throw new Error('File tidak ditemukan')
    blob = resolved.blob
  } else {
    const res = await fetch(url)
    if (res.status === 404) {
      throw new Error('File sudah kedaluwarsa (masa simpan 24 jam) dan telah dihapus.')
    }
    if (!res.ok) throw new Error(`Gagal mengunduh (HTTP ${res.status})`)

    const contentLength = Number(res.headers.get('content-length')) || null
    if (!res.body || !contentLength) {
      blob = await res.blob()
      onProgress?.(100)
    } else {
      const reader = res.body.getReader()
      const pieces: Uint8Array[] = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        pieces.push(value)
        received += value.length
        onProgress?.(Math.min(99, Math.round((received / contentLength) * 100)))
      }
      blob = new Blob(pieces as BlobPart[], { type: res.headers.get('content-type') || 'application/octet-stream' })
      onProgress?.(100)
    }
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
