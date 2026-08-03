import { useEffect, useRef, useState } from 'react'
import { resolveChunkedFile, isChunkedManifestUrl } from '@/services/supabase'

/**
 * Resolve a file URL into something renderable (e.g. <img src>).
 * For chunked files (uploaded in parts due to the 50MB limit), the chunks are
 * reassembled into a Blob and exposed as an object URL. Regular URLs pass through.
 * @param url - Public URL of the file
 * @returns A renderable URL (object URL for chunked files, original otherwise)
 */
export function useResolvedFileUrl(url?: string): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(url)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!url || !isChunkedManifestUrl(url)) {
      setResolved(url)
      return
    }

    setResolved(undefined)
    resolveChunkedFile(url)
      .then((result) => {
        if (cancelled || !result) return
        const objectUrl = URL.createObjectURL(result.blob)
        objectUrlRef.current = objectUrl
        setResolved(objectUrl)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [url])

  return resolved
}
