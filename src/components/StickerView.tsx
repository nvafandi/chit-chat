import { useEffect, useState } from 'react'
import { Typography, Box } from '@mui/material'
import type { Message } from '@/types'
import {
  isStickerMessage,
  extractStickerId,
  getStickerById,
  fetchCustomStickerFromFirestore,
  type Sticker,
} from '@/utils/stickers'

export default function StickerView({ message }: { message: Message }) {
  const [resolved, setResolved] = useState<Sticker | null>(null)

  useEffect(() => {
    if (message.stickerData?.content) {
      setResolved({
        id: message.stickerData.id,
        name: message.stickerData.name,
        type: message.stickerData.type,
        content: message.stickerData.content,
        category: 'inline',
      })
      return
    }
    if (!isStickerMessage(message.content)) return
    const id = extractStickerId(message.content)
    if (!id) return
    const builtin = getStickerById(id)
    if (builtin) {
      setResolved(builtin)
      return
    }
    let cancelled = false
    fetchCustomStickerFromFirestore(id).then((s) => {
      if (!cancelled && s) setResolved(s)
    })
    return () => {
      cancelled = true
    }
  }, [message])

  if (!resolved) return <Typography sx={{ fontSize: 40 }}>🙂</Typography>
  if (resolved.type === 'image') {
    return <Box component="img" src={resolved.content} sx={{ width: 140, height: 140, objectFit: 'contain' }} />
  }
  return (
    <Typography sx={{ fontSize: 64, lineHeight: 1.2 }} role="img">
      {resolved.content}
    </Typography>
  )
}
