import { useEffect, useRef } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import type { Message } from '@/types'

interface Props {
  messages: Message[]
  renderItem: (m: Message) => React.ReactNode
  onLoadMore: () => void
  isLoadingMore: boolean
  hasMore: boolean
}

export default function MessageList({ messages, renderItem, onLoadMore, isLoadingMore, hasMore }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevFirstIdRef = useRef<string | null>(null)
  const prevHeightRef = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const firstId = messages[0]?.id ?? null
    // Prepend happened (older page loaded): keep viewport anchored
    if (firstId && prevFirstIdRef.current && firstId !== prevFirstIdRef.current) {
      el.scrollTop = el.scrollHeight - prevHeightRef.current
    } else {
      // Normal new-message flow: stick to bottom if already near bottom
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
      if (nearBottom || prevFirstIdRef.current === null) {
        el.scrollTop = el.scrollHeight
      }
    }
    prevFirstIdRef.current = firstId
    prevHeightRef.current = el.scrollHeight
  }, [messages])

  return (
    <Box
      ref={containerRef}
      sx={{ flexGrow: 1, overflowY: 'auto', px: { xs: 1, md: '2rem' }, py: 1.5 }}
      onScroll={(e) => {
        const el = e.currentTarget
        if (el.scrollTop < 80 && hasMore && !isLoadingMore) onLoadMore()
      }}
    >
      {!hasMore && messages.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', py: 0.5 }}>
          — Awal percakapan —
        </Typography>
      )}
      {isLoadingMore && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 1 }} />}
      {messages.map(renderItem)}
    </Box>
  )
}
