import { useState } from 'react'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Checkbox,
  List,
  ListItemButton,
  Typography,
  Alert,
  Stack,
} from '@mui/material'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import type { ChatRoom, MemberInfo, RoomType } from '@/types'
import { createRoom, addGroupMembers } from '@/services/firebase'
import { MAX_ROOM_NAME_LENGTH } from '@/utils/const'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (room: ChatRoom) => void
  creator: MemberInfo
  allUsers: MemberInfo[]
}

export default function CreateChannelDialog({ open, onClose, onCreated, creator, allUsers }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<RoomType>('room')
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setType('room')
    setInvited(new Set())
    setError(null)
  }

  function toggleInvite(id: string) {
    setInvited((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nama channel tidak boleh kosong')
      return
    }
    if (trimmed.length > MAX_ROOM_NAME_LENGTH) {
      setError(`Maksimal ${MAX_ROOM_NAME_LENGTH} karakter`)
      return
    }
    setSaving(true)
    try {
      const room = await createRoom(trimmed, type, creator)
      if (type === 'group' && invited.size > 0) {
        const members = allUsers.filter((u) => invited.has(u.id))
        await addGroupMembers(room.id, members)
      }
      reset()
      onCreated(room)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat channel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Buat Channel Baru</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={`Nama channel (maks. ${MAX_ROOM_NAME_LENGTH})`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            fullWidth
          />
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, v) => v && setType(v)}
            fullWidth
          >
            <ToggleButton value="room">
              <PublicIcon sx={{ mr: 1, fontSize: 18 }} /> Publik
            </ToggleButton>
            <ToggleButton value="group">
              <LockIcon sx={{ mr: 1, fontSize: 18 }} /> Privat
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">
            {type === 'room'
              ? 'Semua orang bisa join kapan saja.'
              : 'Hanya member yang diundang yang bisa melihat & bergabung.'}
          </Typography>

          {type === 'group' && (
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Undang member ({invited.size} dipilih)
              </Typography>
              <List
                dense
                sx={{ maxHeight: 200, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}
              >
                {allUsers
                  .filter((u) => u.id !== creator.id)
                  .map((u) => (
                    <ListItemButton key={u.id} onClick={() => toggleInvite(u.id)}>
                      <FormControlLabel
                        control={<Checkbox checked={invited.has(u.id)} />}
                        label={`${u.animal ?? '🐾'} ${u.username}`}
                        sx={{ m: 0, width: '100%' }}
                      />
                    </ListItemButton>
                  ))}
                {allUsers.filter((u) => u.id !== creator.id).length === 0 && (
                  <ListItemButton disabled>
                    <Typography variant="caption">Belum ada user lain</Typography>
                  </ListItemButton>
                )}
              </List>
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Batal</Button>
        <Button onClick={handleCreate} variant="contained" disabled={saving}>
          {saving ? 'Membuat...' : 'Buat'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
