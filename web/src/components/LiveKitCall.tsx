import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  RoomContext,
  useRoomContext,
  useTracks,
  VideoTrack,
  isTrackReference,
} from '@livekit/components-react'
import { Track } from "livekit-client"
import type { TrackReference } from "@livekit/components-react"
import { Box, Typography, IconButton, CircularProgress } from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare'
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import CallEndIcon from '@mui/icons-material/CallEnd'
import { LIVEKIT_URL } from '@/utils/const'
import { generateLiveKitToken } from '@/utils/livekitToken'

interface Props {
  roomName: string
  identity: string
  displayName: string
  onLeave: () => void
}

export default function LiveKitCall({ roomName, identity, displayName, onLeave }: Props) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    generateLiveKitToken({ identity, name: displayName, room: roomName })
      .then(setToken)
      .catch((e) => console.error('[Call] token error:', e))
    return () => {
    }
  }, [identity, displayName, roomName])

  if (!token) {
    return (
      <Overlay>
        <CircularProgress />
        <Typography>Menyiapkan call...</Typography>
      </Overlay>
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
        <RoomContext.Consumer>
          {(room) =>
            room ? (
              <CallView roomName={roomName} displayName={displayName} onLeave={onLeave} />
            ) : null
          }
        </RoomContext.Consumer>
      </LiveKitRoom>
    </Box>
  )
}

function CallView({
  roomName,
  displayName,
  onLeave,
}: {
  roomName: string
  displayName: string
  onLeave: () => void
}) {
  const room = useRoomContext()
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  })
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)
  const [sharing, setSharing] = useState(false)

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

  const visible = tracks.filter((t) => isTrackReference(t)) as TrackReference[]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Typography sx={{ fontWeight: 700 }}># {roomName}</Typography>
        <Typography variant="caption" color="text.secondary">
          {displayName} • {room.remoteParticipants.size + 1} peserta
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, p: 0.75, minHeight: 0 }}>
        {visible.length === 0 ? (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">Belum ada video / share layar</Typography>
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

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 3000, bgcolor: '#121212', display: 'grid', placeItems: 'center', gap: 2 }}>
      <Box sx={{ textAlign: 'center', display: 'grid', gap: 2, justifyItems: 'center' }}>{children}</Box>
    </Box>
  )
}
