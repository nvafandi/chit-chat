import { useEffect, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { isChunkedManifestUrl, resolveChunkedFile } from '@/services/supabase'

interface Props {
  url: string
  alt?: string
  width?: number
  height?: number
  onClick?: () => void
}

/** Renders Supabase images, transparently reassembling chunked manifests. */
export default function ResolvedImage({ url, alt, width = 240, height = 170, onClick }: Props) {
  const [src, setSrc] = useState<string>(isChunkedManifestUrl(url) ? '' : url)
  const [loading, setLoading] = useState(isChunkedManifestUrl(url))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoke: string | null = null
    let cancelled = false
    async function load() {
      if (!isChunkedManifestUrl(url)) return
      setLoading(true)
      try {
        const res = await resolveChunkedFile(url)
        if (!cancelled && res?.blob) {
          revoke = URL.createObjectURL(res.blob)
          setSrc(revoke)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [url])

  if (loading) {
    return (
      <Box sx={{ width, height, display: 'grid', placeItems: 'center', bgcolor: 'action.hover', borderRadius: 1.5 }}>
        <CircularProgress size={22} />
      </Box>
    )
  }
  if (failed) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1.5,
          border: '1px dashed',
          borderColor: 'divider',
          textAlign: 'center',
          p: 1,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 26 }}>🖼️</Typography>
          <Typography variant="caption" color="text.secondary">
            Gambar tidak tersedia
            <br />
            (kedaluwarsa / dihapus)
          </Typography>
        </Box>
      </Box>
    )
  }
  if (!src) return null
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      onClick={onClick}
      sx={{ width, height, objectFit: 'cover', borderRadius: 1.5, cursor: 'pointer' }}
    />
  )
}
