import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  TextField,
  Typography,
  Stack,
  Divider,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import LockIcon from '@mui/icons-material/Lock'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import CloseIcon from '@mui/icons-material/Close'
import type { ChatRoom, MemberInfo } from '@/types'
import { addGroupMembers, removeGroupMember } from '@/services/firebase'

interface Props {
  room: ChatRoom
  currentUserId: string
  allUsers: MemberInfo[]
  onClose: () => void
}

export default function ManageMembersDialog({ room, currentUserId, allUsers, onClose }: Props) {
  const isOwner = room.createdBy === currentUserId
  const [members, setMembers] = useState<MemberInfo[]>(room.memberDetails ?? [])
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const memberIds = new Set(members.map((m) => m.id))
  const candidates = allUsers.filter(
    (u) =>
      !memberIds.has(u.id) &&
      u.id !== currentUserId &&
      u.username.toLowerCase().includes(query.toLowerCase())
  )

  async function handleAdd(user: MemberInfo) {
    setBusy(true)
    try {
      await addGroupMembers(room.id, [user])
      setMembers((prev) => [...prev, user])
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(userId: string) {
    setBusy(true)
    try {
      await removeGroupMember(room.id, userId)
      setMembers((prev) => prev.filter((m) => m.id !== userId))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LockIcon sx={{ fontSize: 16 }} /> Member — {room.name}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary">
          {members.length} member
        </Typography>
        <List dense>
          {members.map((m) => (
            <ListItemButton key={m.id} disableRipple sx={{ cursor: 'default' }}>
              <ListItemAvatar>
                <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>{m.animal ?? '🐾'}</Avatar>
              </ListItemAvatar>
              <ListItemText primary={m.username} secondary={m.id === room.createdBy ? 'Owner' : undefined} />
              {isOwner && m.id !== currentUserId && m.id !== room.createdBy && (
                <IconButton size="small" disabled={busy} onClick={() => handleRemove(m.id)} title="Keluarkan">
                  <PersonRemoveIcon fontSize="small" />
                </IconButton>
              )}
            </ListItemButton>
          ))}
        </List>

        {isOwner && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
              <PersonAddIcon fontSize="small" />
              <Typography variant="body2">Tambah member</Typography>
            </Stack>
            {!adding ? (
              <Button size="small" onClick={() => setAdding(true)}>
                Pilih user…
              </Button>
            ) : (
              <>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Cari username…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <List dense sx={{ maxHeight: 180, overflowY: 'auto' }}>
                  {candidates.map((u) => (
                    <ListItemButton key={u.id} disabled={busy} onClick={() => handleAdd(u)}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>{u.animal ?? '🐾'}</Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={u.username} />
                    </ListItemButton>
                  ))}
                  {candidates.length === 0 && (
                    <ListItemButton disabled>
                      <Typography variant="caption">Tidak ada kandidat</Typography>
                    </ListItemButton>
                  )}
                </List>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Tutup</Button>
      </DialogActions>
    </Dialog>
  )
}
