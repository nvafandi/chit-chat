import { ref, watch, onUnmounted, type Ref } from 'vue'
import { resolveChunkedFile, isChunkedManifestUrl } from '@/services/supabase'

/**
 * Resolve a file URL into something renderable (e.g. <img src>).
 * For chunked files (uploaded in parts due to the 50MB limit), the chunks are
 * reassembled into a Blob and exposed as an object URL. Regular URLs pass through.
 * @param url - Reactive public URL of the file
 * @returns A renderable reactive URL (object URL for chunked files, original otherwise)
 */
export function useResolvedFileUrl(url: Ref<string | undefined>) {
  const resolved = ref<string | undefined>(url.value)
  let objectUrl: string | null = null
  let token = 0

  watch(
    url,
    (value) => {
      const current = ++token

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }

      if (!value || !isChunkedManifestUrl(value)) {
        resolved.value = value
        return
      }

      resolved.value = undefined
      resolveChunkedFile(value)
        .then((result) => {
          if (current !== token || !result) return
          objectUrl = URL.createObjectURL(result.blob)
          resolved.value = objectUrl
        })
        .catch(() => {})
    },
    { immediate: true }
  )

  onUnmounted(() => {
    token++
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
  })

  return resolved
}
