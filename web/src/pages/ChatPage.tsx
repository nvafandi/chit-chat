import { useEffect, useRef, useState } from 'react'
import {
  Avatar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Button,
  TextField,
  Tooltip,
  Badge,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import SendIcon from '@mui/icons-material/Send'
import LogoutIcon from '@mui/icons-material/Logout'
import PhoneIcon from '@mui/icons-material/Phone'
import LockIcon from '@mui/icons-material/Lock'
import type { Message, ChatRoom } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { sendMessage, joinRoom, startLiveLocation, updateLiveLocation, stopLiveLocation as fbStopLiveLocation } from '@/services/firebase'
import { uploadFile } from '@/services/supabase'
import { compressImageMaximum, isCompressibleImage } from '@/utils/imageCompression'
import { DEFAULT_ROOM_ID } from '@/utils/const'
import { formatAsSticker, isStickerMessage, type Sticker as StickerItem } from '@/utils/stickers'
import MessageList from '@/components/MessageList'
import StickerView from '@/components/StickerView'
import StickerPicker from '@/components/StickerPicker'
import LiveKitCall from '@/components/LiveKitCall'

interface PendingFile {
  file: File
  previewUrl: string
  name: string
  mimeType?: string
  size: number
  isImage: boolean
}

const DRAWER_WIDTH = 240

export default function ChatPage() {
  const user = useAuthStore((s) => s.user)!
  const logout = useAuthStore((s) => s.logout)
  const { messages, users, rooms, currentRoomId, setCurrentRoom } = useChatStore()

  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showStickers, setShowStickers] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [isLiveTracking, setIsLiveTracking] = useState(false)
  const liveMsgIdRef = useRef<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastLocUpdateRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentRoom = rooms.find((r) => r.id === currentRoomId)
  const roomName =
    currentRoom?.name ?? (currentRoomId === DEFAULT_ROOM_ID ? 'General' : currentRoomId)

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
  }, [])

  function handleSelectRoom(room: ChatRoom) {
    if (room.id === currentRoomId) return
    if (room.type === 'room') {
      joinRoom(room.id, { id: user.id, username: user.username, animal: user.animal }).catch(() => {})
    }
    setCurrentRoom(room.id)
  }

  async function handleSend() {
    const content = input.trim()
    if ((!content && pendingFiles.length === 0) || isUploading) return

    let attachments
    const files = pendingFiles
    if (files.length > 0) {
      try {
        setIsUploading(true)
        attachments = await Promise.all(
          files.map(async (f) => {
            let blob: Blob = f.file
            if (f.isImage && isCompressibleImage(f.file)) {
              try {
                blob = (await compressImageMaximum(f.file)).blob
              } catch { /* fall back to original */ }
            }
            const url = await uploadFile(blob, `${Date.now()}-${f.name}`)
            if (!url) throw new Error(`Upload gagal: ${f.name}`)
            return {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              url,
              type: (f.isImage ? 'image' : 'file') as 'image' | 'file',
              mimeType: f.isImage ? 'image/jpeg' : f.mimeType ?? 'application/octet-stream',
              name: f.name,
              size: blob.size,
            }
          })
        )
      } catch (e) {
        console.error('[Chat] upload failed:', e)
        setIsUploading(false)
        return
      }
      setIsUploading(false)
      setPendingFiles([])
    }

    setInput('')
    await sendMessage(
      user.id,
      user.username,
      user.animal,
      content || `📎 ${files[0]?.name ?? 'Attachment'}`,
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      undefined,
      attachments,
      undefined,
      currentRoomId
    )
  }

  function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    setPendingFiles((prev) => [
      ...prev,
      ...list.map((f) => ({
        file: f,
        previewUrl: isCompressibleImage(f) || f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
        name: f.name,
        mimeType: f.type,
        size: f.size,
        isImage: f.type.startsWith('image/'),
      })),
    ])
    e.target.value = ''
  }

  // ---- Live location -------------------------------------------------------
  async function toggleLive() {
    if (isLiveTracking) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      if (liveMsgIdRef.current) await fbStopLiveLocation(liveMsgIdRef.current).catch(() => {})
      liveMsgIdRef.current = null
      setIsLiveTracking(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const sent = await sendMessage(
          user.id, user.username, user.animal,
          '📍 Live Location',
          undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, undefined,
          undefined, undefined,
          { latitude: lat, longitude: lng },
          currentRoomId, true
        )
        await startLiveLocation(sent.id, currentRoomId ?? DEFAULT_ROOM_ID, user.id, user.username, user.animal, lat, lng)
        liveMsgIdRef.current = sent.id
        lastLocUpdateRef.current = Date.now()
        setIsLiveTracking(true)
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const now = Date.now()
            if (now - lastLocUpdateRef.current < 10_000 || !liveMsgIdRef.current) return
            lastLocUpdateRef.current = now
            updateLiveLocation(liveMsgIdRef.current, p.coords.latitude, p.coords.longitude).catch(() => {})
          },
          () => {},
          { enableHighAccuracy: true }
        )
      },
      () => alert('Izin lokasi ditolak'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function handleSelectSticker(sticker: StickerItem) {
    setShowStickers(false)
    await sendMessage(
      user.id, user.username, user.animal,
      formatAsSticker(sticker.id),
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      { id: sticker.id, type: sticker.type, content: sticker.content, name: sticker.name },
      undefined, undefined,
      currentRoomId
    )
  }

  function renderMessage(message: Message) {
    const isOwn = message.userId === user.id
    if (isStickerMessage(message.content) || message.stickerData) {
      return (
        <Box sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', my: 1 }}>
          <Box>
            {!isOwn && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                {message.animal} {message.username}
              </Typography>
            )}
            <StickerView message={message} />
          </Box>
        </Box>
      )
    }
    return (
      <Box key={message.id} sx={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', my: 0.75 }}>
        <Box sx={{ maxWidth: '72%', display: 'flex', gap: 1, alignItems: 'flex-end', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
          {!isOwn && (
            <Avatar
              src={users.find((u) => u.id === message.userId)?.photoUrl}
              sx={{ width: 30, height: 30, fontSize: 15, bgcolor: 'background.paper' }}
            >
              {message.animal ?? '🐾'}
            </Avatar>
          )}
          <Box sx={{ bgcolor: isOwn ? 'primary.main' : 'background.paper', color: isOwn ? '#fff' : 'text.primary', borderRadius: 2.5, borderBottomRightRadius: isOwn ? 0.5 : 2.5, borderTopLeftRadius: isOwn ? 2.5 : 0.5, px: 1.5, py: 1 }}>
            {!isOwn && (
              <Typography variant="caption" sx={{ color: '#c79fff', fontWeight: 700, display: 'block' }}>
                {message.animal} {message.username}
              </Typography>
            )}
            {message.isLiveLocation && message.location && (
              <Box component="span" sx={{ mb: 0.5, display: 'block' }}>📍 Live Location aktif</Box>
            )}
            {renderAttachments(message)}
            {!!message.content && !message.isLiveLocation && (
              <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', mt: message.attachments?.length ? 0.5 : 0 }}>
                {message.content}
              </Typography>
            )}
            <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', textAlign: 'right', fontSize: 10 }}>
              {new Date(message.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
        </Box>
      </Box>
    )
  }

  function renderAttachments(message: Message) {
    const list =
      message.attachments ??
      [
        message.imageUrl ? { url: message.imageUrl, type: 'image', name: message.imageName ?? 'image', size: message.imageSize ?? 0 } : null,
        message.fileUrl ? { url: message.fileUrl, type: 'file', name: message.fileName ?? 'file', size: message.fileSize ?? 0 } : null,
      ].filter(Boolean)

    if (!list.length) return null
    return (
      <Box sx={{ display: 'grid', gap: 0.5 }}>
        {(list as never[]).map((att: any, i: number) =>
          att.type === 'image' ? (
            <Box
              key={i}
              component="img"
              src={att.url}
              alt={att.name}
              onClick={() => window.open(att.url, '_blank')}
              sx={{ width: 240, height: 170, objectFit: 'cover', borderRadius: 1.5, cursor: 'pointer' }}
            />
          ) : (
            <Box
              key={i}
              component="a"
              href={att.url}
              target="_blank"
              rel="noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', color: 'inherit', bgcolor: 'rgba(0,0,0,0.25)', px: 1, py: 0.5, borderRadius: 1 }}
            >
              📄 <Typography variant="caption" noWrap>{att.name}</Typography>
            </Box>
          )
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Channel sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#2b2d31', borderRight: '1px solid rgba(255,255,255,0.06)' },
        }}
      >
        <Box sx={{ p: 2, color: "#f2f3f5", borderBottom: '1px solid rgba(0,0,0,0.35)' }}>
          CHIT CHuT
        </Box>
        <List sx={{ flexGrow: 1 }}>
          <Typography sx={{ px: 2, pt: 2, pb: 1, fontSize: 11, letterSpacing: 1.5, color: '#949ba4', textTransform: 'uppercase' }}>
            Channels
          </Typography>
          {(rooms.length > 0
            ? rooms
            : ([{ id: DEFAULT_ROOM_ID, name: 'General', type: 'room' }] as ChatRoom[])
          ).map((room) => (
            <ListItemButton
              key={room.id}
              selected={room.id === currentRoomId}
              onClick={() => handleSelectRoom(room)}
              sx={{ mx: 1, borderRadius: 1.5, '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.08)' } }}
            >
              <Typography component="span" sx={{ mr: 1, color: '#717171' }}>#</Typography>
              <ListItemText disableTypography primary={<Typography variant="body2" noWrap>{room.name}</Typography>} />
              {room.type === 'group' && <LockIcon sx={{ fontSize: 13, color: '#949ba4' }} />}
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 1.5, borderTop: '1px solid rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={user.photoUrl} sx={{ width: 30, height: 30, fontSize: 16 }}>
            {user.animal}
          </Avatar>
          <Typography variant="body2" noWrap sx={{ flexGrow: 1, color: '#b5bac1' }}>
            {user.username}
          </Typography>
          <IconButton size="small" onClick={logout} title="Logout">
            <LogoutIcon sx={{ fontSize: 17, color: '#b5bac1' }} />
          </IconButton>
        </Box>
      </Drawer>

      {/* Main area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1, px: 2, bgcolor: '#313338', borderBottom: '1px solid rgba(0,0,0,0.35)' }}>
          <Typography sx={{ color: '#949ba4' }}>#</Typography>
          <Typography noWrap sx={{ fontWeight: 600, color: "#f2f3f5" }}>{roomName}</Typography>
          <Badge badgeContent={users.length} color="primary" sx={{ ml: 1 }}>
            <Box sx={{ width: 8 }} />
          </Badge>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Channel call">
            <IconButton size="small" onClick={() => setInCall(true)}>
              <PhoneIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <MessageList
          messages={messages}
          renderItem={renderMessage}
          onLoadMore={() => useChatStore.getState().loadMore()}
          isLoadingMore={useChatStore((s) => s.isLoadingMore)}
          hasMore={useChatStore((s) => s.hasMore)}
        />

        {/* Pending preview strip */}
        {pendingFiles.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, px: 1.5, pt: 1, flexWrap: 'wrap' }}>
            {pendingFiles.map((f, i) => (
              <Box key={i} sx={{ position: 'relative' }}>
                {f.previewUrl ? (
                  <Box component="img" src={f.previewUrl} sx={{ width: 52, height: 52, borderRadius: 1.5, objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ width: 52, height: 52, borderRadius: 1.5, bgcolor: 'background.paper', display: 'grid', placeItems: 'center', fontSize: 22 }}>📄</Box>
                )}
                <IconButton
                  size="small"
                  onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                  sx={{ position: 'absolute', top: -6, right: -6, bgcolor: 'rgba(0,0,0,0.7)', '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' }, width: 18, height: 18, '& svg': { fontSize: 12 } }}
                >
                  ✕
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* Composer */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, p: 1.5, bgcolor: '#313338' }}>
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilesChosen} data-files="pending" />
          <Tooltip title="Attach"><IconButton component="span" onClick={() => fileInputRef.current?.click()}><AttachFileIcon /></IconButton></Tooltip>
          <Tooltip title={isLiveTracking ? 'Stop live location' : 'Live location'}>
            <IconButton onClick={toggleLive} color={isLiveTracking ? 'success' : 'default'}>
              {isLiveTracking ? <StopCircleIcon /> : <MyLocationIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Sticker">
            <IconButton onClick={() => setShowStickers(true)}><EmojiEmotionsIcon /></IconButton>
          </Tooltip>
          <TextField
            fullWidth
            multiline
            maxRows={5}
            size="small"
            placeholder={`Message # ${roomName}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button variant="contained" onClick={handleSend} disabled={!input.trim() && pendingFiles.length === 0} sx={{ minWidth: 48, px: 1.5 }}>
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Box>

      {/* Add-channel quick action (phase 2: full dialog) */}
      <Tooltip title="Add channel (coming soon)">
        <IconButton
          sx={{ position: 'fixed', bottom: 90, left: DRAWER_WIDTH / 2 - 20, display: { xs: 'none', md: 'inline-flex' } }}
          size="small"
        >
          <AddIcon />
        </IconButton>
      </Tooltip>

      <StickerPicker open={showStickers} onClose={() => setShowStickers(false)} onSelect={handleSelectSticker} />

      {inCall && (
        <LiveKitCall
          roomName={`channel-${currentRoomId}`}
          identity={`${user.id}-web-${Date.now()}`}
          displayName={`${user.animal} ${user.username}`}
          onLeave={() => setInCall(false)}
        />
      )}
    </Box>
  )
}
