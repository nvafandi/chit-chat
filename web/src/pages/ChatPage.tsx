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
  Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import MenuIcon from '@mui/icons-material/Menu'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme as useMuiTheme } from '@mui/material/styles'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import SendIcon from '@mui/icons-material/Send'
import LogoutIcon from '@mui/icons-material/Logout'
import PhoneIcon from '@mui/icons-material/Phone'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import SettingsIcon from '@mui/icons-material/Settings'
import PushPinIcon from '@mui/icons-material/PushPin'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import LockIcon from '@mui/icons-material/Lock'
import type { Message, ChatRoom, ReplyTo } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { sendMessage, joinRoom, startLiveLocation, updateLiveLocation, stopLiveLocation as fbStopLiveLocation } from '@/services/firebase'
import { uploadFile } from '@/services/supabase'
import { compressImageMaximum, isCompressibleImage } from '@/utils/imageCompression'
import { DEFAULT_ROOM_ID } from '@/utils/const'
import { formatAsSticker, isStickerMessage, type Sticker as StickerItem } from '@/utils/stickers'
import MessageList from '@/components/MessageList'
import CreateChannelDialog from '@/components/CreateChannelDialog'
import ManageMembersDialog from '@/components/ManageMembersDialog'
import LiveLocationBubble from '@/components/LiveLocationBubble'
import ResolvedImage from '@/components/ResolvedImage'
import RichContent from '@/components/RichContent'
import { downloadAttachment } from '@/utils/download'
import ReplyIcon from '@mui/icons-material/Reply'
import {
  isNotificationsEnabled,
  setNotificationUserId,
  setNotificationsEnabled,
  startMessageNotifier,
} from '@/services/notificationService'
import {
  pinMessage,
  unpinMessage,
  hideMessage,
} from '@/services/firebase'
import {
  getLastMentionBeingTyped,
  insertMention,
} from '@/utils/mentionFormatter'
import StickerView from '@/components/StickerView'
import StickerPicker from '@/components/StickerPicker'
import LiveKitCall from '@/components/LiveKitCall'
import EmojiPicker from '@/components/EmojiPicker'
import ImageViewer from '@/components/ImageViewer'
import LiveRoomMap from '@/components/LiveRoomMap'
import { subscribeToActiveRoomLocations } from '@/services/firebase'
import MapIcon from '@mui/icons-material/Map'
import { useThemeStore } from '@/stores/themeStore'

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
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [manageRoom, setManageRoom] = useState<ChatRoom | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mention, setMention] = useState<{ mention: string; startIndex: number } | null>(null)
  const inputElRef = useRef<HTMLTextAreaElement | null>(null)
  const [isLiveTracking, setIsLiveTracking] = useState(false)
  const [notifOn, setNotifOn] = useState(isNotificationsEnabled())
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null)
  const [isDragover, setIsDragover] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null)
  const [showRoomMap, setShowRoomMap] = useState(false)
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches)
  const [activeSharers, setActiveSharers] = useState(0)

  useEffect(() => {
    const unsub = subscribeToActiveRoomLocations(currentRoomId, (locs) =>
      setActiveSharers(locs.length)
    )
    return unsub
  }, [currentRoomId])

  useEffect(() => {
    if (!user) return
    setNotificationUserId(user.id)
    const stop = startMessageNotifier()
    return () => {
      stop()
      setNotificationUserId(null)
    }
  }, [user])
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
    setReplyingTo(null)
    await sendMessage(
      user.id,
      user.username,
      user.animal,
      content || `📎 ${files[0]?.name ?? 'Attachment'}`,
      replyingTo ?? undefined,
      undefined, undefined, undefined, undefined,
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

  const pinnedMessages = messages.filter((m) => m.pinned)
  const isSearching = searchQuery.trim().length >= 3
  const visibleMessages = isSearching
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : messages

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
            {message.replyTo && (
              <Box
                sx={{
                  mb: 0.5,
                  p: 0.5,
                  pl: 1,
                  borderRadius: 1,
                  bgcolor: 'rgba(0,0,0,0.25)',
                  borderLeft: '2px solid',
                  borderColor: isOwn ? 'rgba(255,255,255,0.6)' : '#c79fff',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const el = document.getElementById(`msg-${message.replyTo!.id}`)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: isOwn ? '#fff' : '#c79fff' }}>
                  {message.replyTo.animal} {message.replyTo.username}
                </Typography>
                <Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.75, maxWidth: 260 }}>
                  {message.replyTo.content}
                </Typography>
              </Box>
            )}
            {message.isLiveLocation && message.location && <LiveLocationBubble message={message} />}
            {!message.isLiveLocation && message.location && (
              <Box
                component="a"
                href={`https://www.google.com/maps/search/?api=1&query=${message.location.latitude},${message.location.longitude}`}
                target="_blank"
                rel="noreferrer"
                sx={{ display: 'block', width: 240, borderRadius: 1.5, overflow: 'hidden', mb: 0.5, textDecoration: 'none' }}
              >
                <Box
                  component="iframe"
                  title="Lokasi"
                  src={`https://maps.google.com/maps?q=${message.location.latitude},${message.location.longitude}&z=15&output=embed`}
                  sx={{ width: 240, height: 140, border: 0, display: 'block', pointerEvents: 'none' }}
                />
              </Box>
            )}
            {renderAttachments(message)}
            {!!message.content && !message.isLiveLocation && (
              <Box sx={{ mt: message.attachments?.length ? 0.5 : 0 }}>
                <RichContent content={message.content} isOwn={isOwn} />
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.55, fontSize: 10 }}>
                {new Date(message.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </Typography>
              {message.pinned && <PushPinIcon sx={{ fontSize: 11, transform: 'rotate(45deg)', opacity: 0.8 }} />}
            </Box>
          </Box>

          {/* Hover actions */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.25,
              opacity: 0,
              transition: 'opacity 0.15s',
              alignSelf: 'center',
              '&:hover': { opacity: 1 },
              // parent hover reveal
            }}
            className="msg-actions"
          >
            <IconButton
              size="small"
              title="Balas"
              onClick={() =>
                setReplyingTo({
                  id: message.id,
                  username: message.username,
                  animal: message.animal ?? '🐾',
                  content: message.content.slice(0, 120),
                })
              }
            >
              <ReplyIcon sx={{ fontSize: 15 }} />
            </IconButton>
            <IconButton
              size="small"
              title={message.pinned ? 'Lepas pin' : 'Pin pesan'}
              onClick={() =>
                message.pinned
                  ? unpinMessage(message.id)
                  : pinMessage(message.id, user.username)
              }
            >
              <PushPinIcon sx={{ fontSize: 15, transform: message.pinned ? 'rotate(45deg)' : 'none' }} color={message.pinned ? 'warning' : 'inherit'} />
            </IconButton>
            {message.userId === user.id && (
              <IconButton size="small" title="Hapus pesan" onClick={() => hideMessage(message.id)}>
                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
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
            <ResolvedImage
              key={i}
              url={att.url}
              alt={att.name}
              onClick={() => setViewerUrl(att.url)}
            />
          ) : (
            <Box
              key={i}
              component="button"
              onClick={() => downloadAttachment(att.url, att.name).catch(() => window.open(att.url, '_blank'))}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', color: 'inherit', bgcolor: 'rgba(0,0,0,0.25)', px: 1, py: 0.5, borderRadius: 1, border: 'none', cursor: 'pointer', textAlign: 'left' }}
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
        variant={isMobile ? 'temporary' : 'persistent'}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: '#2b2d31',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            ...(isMobile ? {} : { position: 'relative' }),
          },
        }}
      >
        <Box sx={{ p: 2, color: "#f2f3f5", borderBottom: '1px solid rgba(0,0,0,0.35)' }}>
          CHIT CHuT
        </Box>
        <List sx={{ flexGrow: 1 }}>
          <Typography sx={{ px: 2, pt: 2, pb: 1, fontSize: 11, letterSpacing: 1.5, color: '#949ba4', textTransform: 'uppercase' }}>
            Channels
          </Typography>
          {rooms.map((room) => (
            <ListItemButton
              key={room.id}
              selected={room.id === currentRoomId}
              onClick={() => handleSelectRoom(room)}
              sx={{ mx: 1, borderRadius: 1.5, '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.08)' } }}
            >
              <Typography component="span" sx={{ mr: 1, color: '#717171' }}>#</Typography>
              <ListItemText disableTypography primary={<Typography variant="body2" noWrap>{room.name}</Typography>} />
              {room.type === 'group' && <LockIcon sx={{ fontSize: 13, color: '#949ba4' }} />}
              {room.id !== DEFAULT_ROOM_ID && (
                <IconButton
                  size="small"
                  title={room.type === 'group' ? 'Kelola member' : 'Info channel'}
                  onClick={(e) => {
                    e.stopPropagation()
                    setManageRoom(room)
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 14, color: '#949ba4' }} />
                </IconButton>
              )}
            </ListItemButton>
          ))}
          <ListItemButton
            onClick={() => setShowCreateChannel(true)}
            sx={{ mx: 1, borderRadius: 1.5, color: '#949ba4' }}
          >
            <AddIcon sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">Buat Channel</Typography>
          </ListItemButton>
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
          <Tooltip title={sidebarOpen && !isMobile ? 'Sembunyikan sidebar' : 'Tampilkan sidebar'}>
            <IconButton size="small" onClick={() => setSidebarOpen((v) => !v)}>
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Typography sx={{ color: '#949ba4' }}>#</Typography>
          <Typography noWrap sx={{ fontWeight: 600, color: "#f2f3f5" }}>{roomName}</Typography>
          <Badge badgeContent={users.length} color="primary" sx={{ ml: 1 }}>
            <Box sx={{ width: 8 }} />
          </Badge>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size="small"
            placeholder="Cari (min 3 huruf)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 200, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.06)' }, '& input': { py: 0.5, fontSize: 13 } }}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 0.5, color: '#949ba4' }} /> } }}
          />
          <Tooltip title={notifOn ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}>
            <IconButton
              size="small"
              onClick={async () => {
                const next = !notifOn
                await setNotificationsEnabled(next)
                setNotifOn(isNotificationsEnabled())
              }}
            >
              {notifOn ? <NotificationsIcon sx={{ fontSize: 18 }} /> : <NotificationsOffIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Peta live location gabungan">
            <IconButton size="small" onClick={() => setShowRoomMap(true)}>
              <Badge badgeContent={activeSharers} color="success" slotProps={{ badge: { style: { fontSize: 9, height: 15, minWidth: 15 } } }}>
                <MapIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Channel call">
            <IconButton size="small" onClick={() => setInCall(true)}>
              <PhoneIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <ThemeToggle />
        </Box>

        {pinnedMessages.length > 0 && (
          <Box sx={{ px: 2, py: 0.75, bgcolor: 'rgba(255,193,7,0.08)', borderBottom: '1px solid rgba(255,193,7,0.25)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <PushPinIcon sx={{ fontSize: 14, transform: 'rotate(45deg)', color: 'warning.main' }} />
            <Typography variant="caption" noWrap sx={{ flexGrow: 1, color: 'text.secondary' }}>
              {pinnedMessages.length} pesan dipin — terakhir:{' '}
              <strong>{pinnedMessages[pinnedMessages.length - 1].content.slice(0, 80)}</strong>
            </Typography>
            <IconButton size="small" title="Lepas pin" onClick={() => unpinMessage(pinnedMessages[pinnedMessages.length - 1].id)}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}
        {isSearching && (
          <Box sx={{ px: 2, py: 0.5, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary">
              {visibleMessages.length} hasil untuk "{searchQuery.trim()}"
            </Typography>
          </Box>
        )}

        <Box
          sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, position: 'relative' }}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragover(true)
          }}
          onDragLeave={() => setIsDragover(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragover(false)
            const files = Array.from(e.dataTransfer.files ?? [])
            if (files.length === 0) return
            setPendingFiles((prev) => [
              ...prev,
              ...files.map((f) => ({
                file: f,
                previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
                name: f.name,
                mimeType: f.type,
                size: f.size,
                isImage: f.type.startsWith('image/'),
              })),
            ])
          }}
        >
          {isDragover && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'rgba(100,30,253,0.15)',
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 1.5,
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h6" color="primary">Drop file untuk dilampirkan</Typography>
            </Box>
          )}
          <MessageList
            messages={visibleMessages}
            renderItem={renderMessage}
            onLoadMore={() => useChatStore.getState().loadMore()}
            isLoadingMore={useChatStore((s) => s.isLoadingMore)}
            hasMore={useChatStore((s) => s.hasMore)}
          />
        </Box>

        {/* Quoted reply preview */}
        {replyingTo && (
          <Box sx={{ mx: 1.5, mt: 1, p: 1, borderRadius: 1.5, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: '#c79fff', fontWeight: 700, display: 'block' }}>
                {replyingTo.animal} {replyingTo.username}
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.7 }}>
                {replyingTo.content}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setReplyingTo(null)}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        )}

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
          <Box sx={{ position: 'relative', flexGrow: 1 }}>
            {mention && (
              <Paper
                elevation={4}
                sx={{ position: 'absolute', bottom: '100%', left: 0, mb: 1, maxHeight: 200, overflowY: 'auto', minWidth: 220, zIndex: 10 }}
              >
                <List dense>
                  {users
                    .filter((u) =>
                      u.username.toLowerCase().startsWith(mention.mention.toLowerCase())
                    )
                    .slice(0, 6)
                    .map((u) => (
                      <ListItemButton
                        key={u.id}
                        onClick={() => {
                          const cursor = inputElRef.current?.selectionStart ?? input.length
                          const res = insertMention(input, cursor, u.username)
                          setInput(res.text)
                          setMention(null)
                          requestAnimationFrame(() =>
                            inputElRef.current?.setSelectionRange(res.cursorPosition, res.cursorPosition)
                          )
                        }}
                      >
                        <Typography variant="body2">
                          {u.animal ?? '🐾'} <strong>@{u.username}</strong>
                        </Typography>
                      </ListItemButton>
                    ))}
                  {users.filter((u) => u.username.toLowerCase().startsWith(mention.mention.toLowerCase())).length === 0 && (
                    <ListItemButton disabled>
                      <Typography variant="caption">Tidak ada user cocok</Typography>
                    </ListItemButton>
                  )}
                </List>
              </Paper>
            )}
            <TextField
              fullWidth
              multiline
              maxRows={5}
              size="small"
              inputRef={inputElRef}
              placeholder={`Message # ${roomName}`}
              value={input}
              onChange={(e) => {
                const v = e.target.value
                setInput(v)
                const cursor = inputElRef.current?.selectionStart ?? v.length
                setMention(getLastMentionBeingTyped(v, cursor))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  setMention(null)
                  handleSend()
                }
              }}
            />
          </Box>
          <Button variant="contained" onClick={handleSend} disabled={!input.trim() && pendingFiles.length === 0} sx={{ minWidth: 48, px: 1.5 }}>
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Box>

      {showCreateChannel && (
        <CreateChannelDialog
          open
          onClose={() => setShowCreateChannel(false)}
          onCreated={(room) => {
            setShowCreateChannel(false)
            handleSelectRoom(room)
          }}
          creator={{ id: user.id, username: user.username, animal: user.animal }}
          allUsers={users.map((u) => ({ id: u.id, username: u.username, animal: u.animal }))}
        />
      )}

      {manageRoom && (
        <ManageMembersDialog
          room={manageRoom}
          currentUserId={user.id}
          allUsers={users.map((u) => ({ id: u.id, username: u.username, animal: u.animal }))}
          onClose={() => setManageRoom(null)}
        />
      )}

      <EmojiPicker
        open={!!emojiAnchor}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        onSelect={(emoji) => {
          setInput((v) => v + emoji)
          setEmojiAnchor(null)
          inputElRef.current?.focus()
        }}
      />

      {viewerUrl && <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />}

      {showRoomMap && <LiveRoomMap roomId={currentRoomId} onClose={() => setShowRoomMap(false)} />}

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

function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const toggle = useThemeStore((s) => s.toggle)
  return (
    <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
      <IconButton size="small" onClick={toggle}>
        {mode === 'dark' ? '☀️' : '🌙'}
      </IconButton>
    </Tooltip>
  )
}
