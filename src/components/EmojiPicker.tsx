import { Popover, Box } from '@mui/material'

const EMOJIS = [
  '😀','😂','🥲','😍','😘','😎','🤔','😴','😡','😭','🤗','🤩','🥳','😇','🙃','😅',
  '🤝','👍','👎','👏','🙏','💪','🫡','🤌','🔥','✨','🎉','❤️','💜','💯','⚡','🚀',
  '🍕','☕','🌙','☀️','🌈','🎁','✅','❌','👀','💬','📍','📎','🧠','🎯','🏆','😅',
]

interface Props {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  onSelect: (emoji: string) => void
}

export default function EmojiPicker({ open, anchorEl, onClose, onSelect }: Props) {
  return (
    <Popover open={open} anchorEl={anchorEl} onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', p: 1, gap: 0.25, width: 264, maxHeight: 200, overflowY: 'auto' }}>
        {EMOJIS.map((e) => (
          <Box
            key={e}
            onClick={() => onSelect(e)}
            sx={{ display: 'grid', placeItems: 'center', fontSize: 20, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
          >
            {e}
          </Box>
        ))}
      </Box>
    </Popover>
  )
}
