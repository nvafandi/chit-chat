import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  VideoTrack,
  isTrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import type { TrackReference } from '@livekit/components-react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Popover,
  Stack,
} from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare'
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import CallEndIcon from '@mui/icons-material/CallEnd'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import LinkIcon from '@mui/icons-material/Link'
import SendIcon from '@mui/icons-material/Send'
import { LIVEKIT_URL } from '@/utils/const'
import { generateLiveKitToken } from '@/utils/livekitToken'

interface Props {
  roomName: string
  identity: string
  displayName: string
  onLeave: () => void
  onInviteChannel?: (roomName: string) => void
}

export default function LiveKitCall({ roomName, identity, displayName, onLeave, onInviteChannel }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  useEffect(() => {
    generateLiveKitToken({ identity, name: displayName, room: roomName })
      .then(setToken)
      .catch((e) => {
        console.error('[Call] token error:', e)
        setTokenError(e instanceof Error ? e.message : 'Gagal membuat token call')
      })
  }, [identity, displayName, roomName])

  if (tokenError) {
    return (
      <CallShell>
        <Alert severity="error" sx={{ maxWidth: 420 }}>
          {tokenError}
        </Alert>
        <Button variant="contained" onClick={onLeave}>Tutup</Button>
      </CallShell>
    )
  }

  if (!token) {
    return (
      <CallShell>
        <CircularProgress />
        <Typography>Menyiapkan call...</Typography>
      </CallShell>
    )
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 3000, bgcolor: '#121212' }}>
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        connect
        options={{ adaptiveStream: true, dynacast: true }}
        audio
        video={false}
        onDisconnected={onLeave}
        onError={(err) => console.error('[Call] error:', err)}
        style={{ height: '100%' }}
      >
        <CallView
          roomName={roomName}
          onLeave={onLeave}
          onInviteChannel={onInviteChannel}
        />
      </LiveKitRoom>
    </Box>
  )
}

function CallShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 3000, bgcolor: '#121212', display: 'grid', placeItems: 'center' }}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        {children}
      </Stack>
    </Box>
  )
}

function CallView({
  roomName,
  onLeave,
  onInviteChannel,
}: Omit<Props, 'identity' | 'displayName'>) {
  const room = useRoomContext()
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  })
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [connected, setConnected] = useState(room.state === 'connected')
  const [inviteAnchor, setInviteAnchor] = useState<HTMLElement | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onConnected = () => setConnected(true)
    const onReconnecting = () => setConnected(false)
    room
      .on('connected', onConnected)
      .on('reconnecting', onReconnecting)
      .on('reconnected', onConnected)
    return () => {
      room.off('connected', onConnected).off('reconnecting', onReconnecting).off('reconnected', onConnected)
    }
  }, [room])

  async function toggleMic() {
    const next = !micOn
    await room.localParticipant.setMicrophoneEnabled(next)
    setMicOn(next)
  }

  async function toggleCam() {
    const next = !camOn
    await room.localParticipant.setCameraEnabled(next)
    setCamOn(next)
  }

  async function toggleShare() {
    const next = !sharing
    try {
      await room.localParticipant.setScreenShareEnabled(next)
      setSharing(next)
    } catch (e) {
      console.warn('[Call] screenshare denied:', e)
    }
  }

  async function leave() {
    await room.disconnect()
    onLeave()
  }

  const inviteUrl = `${window.location.origin}/chat?call=${encodeURIComponent(roomName)}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  const visible = tracks.filter((t) => isTrackReference(t)) as TrackReference[]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontWeight: 700 }}># {roomName}</Typography>
        <Typography variant="caption" color={connected ? 'success.main' : 'warning.main'}>
          {connected ? `• terhubung • ${room.remoteParticipants.size + 1} peserta` : '• menghubungkan...'}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<PersonAddAlt1Icon />}
          onClick={(e) => setInviteAnchor(e.currentTarget)}
        >
          Invite
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, p: 0.75, minHeight: 0 }}>
        {visible.length === 0 ? (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">
              {connected
                ? 'Belum ada video / share layar'
                : 'Menghubungkan ke LiveKit...'}
            </Typography>
          </Box>
        ) : (
          visible.map((ref, i) => (
            <VideoTrack key={i} trackRef={ref} style={{ flexGrow: 1, minWidth: '45%', aspectRatio: '1.4', borderRadius: 12, background: '#1d1626' }} />
          ))
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, py: 1.5, bgcolor: 'background.paper' }}>
        <ControlBtn active={!micOn} danger={!micOn} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
          {micOn ? <MicIcon /> : <MicOffIcon />}
        </ControlBtn>
        <ControlBtn active={camOn} onClick={toggleCam} title="Kamera">
          {camOn ? <VideocamIcon /> : <VideocamOffIcon />}
        </ControlBtn>
        <ControlBtn active={sharing} onClick={toggleShare} title="Share layar">
          {sharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </ControlBtn>
        <IconButton onClick={leave} sx={{ bgcolor: '#e53935', color: '#fff', px: 3, '&:hover': { bgcolor: '#d32f2f' } }}>
          <CallEndIcon />
        </IconButton>
      </Box>

      {/* Invite popover */}
      <Popover
        open={!!inviteAnchor}
        anchorEl={inviteAnchor}
        onClose={() => setInviteAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ p: 2, maxWidth: 340 }}>
          <Typography variant="subtitle2" gutterBottom>Invite peserta</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, wordBreak: 'break-all' }}>
            {inviteUrl}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={copyLink}>
              {copied ? 'Tersalin!' : 'Copy link'}
            </Button>
            {onInviteChannel && (
              <Button
                size="small"
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => {
                  onInviteChannel(roomName)
                  setInviteAnchor(null)
                }}
              >
                Kirim ke channel
              </Button>
            )}
          </Stack>
        </Paper>
      </Popover>
    </Box>
  )
}

function ControlBtn({
  children,
  active,
  danger,
  onClick,
  title,
}: {
  children: React.ReactNode
  active?: boolean
  danger?: boolean
  onClick: () => void
  title: string
}) {
  return (
    <IconButton
      onClick={onClick}
      title={title}
      sx={{
        bgcolor: danger ? '#b13535' : active ? 'primary.main' : 'action.hover',
        color: '#fff',
        '&:hover': { bgcolor: danger ? '#c14545' : active ? 'primary.dark' : 'action.selected' },
      }}
    >
      {children}
    </IconButton>
  )
}
