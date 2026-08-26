import { useState } from 'react'
import { Popover, Tabs, Tab, Box } from '@mui/material'
import { getStickerCategories, getStickersByCategory, type Sticker } from '@/utils/stickers'

const CATEGORY_ICONS: Record<string, string> = {
  emotions: '😀',
  hands: '👍',
  animals: '🐶',
  objects: '🎉',
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (sticker: Sticker) => void
}

export default function StickerPicker({ open, onClose, onSelect }: Props) {
  const [category, setCategory] = useState(getStickerCategories()[0])
  const stickers = getStickersByCategory(category)

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      anchorPosition={{ top: window.innerHeight - 320, left: 70 }}
      anchorReference="anchorPosition"
    >
      <Tabs value={category} onChange={(_, v) => setCategory(v)}>
        {getStickerCategories().map((c) => (
          <Tab key={c} value={c} label={CATEGORY_ICONS[c] ?? c} />
        ))}
      </Tabs>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', p: 1, gap: 0.5, maxHeight: 220, overflowY: 'auto', width: 300 }}>
        {stickers.map((s) => (
          <Box
            key={s.id}
            onClick={() => onSelect(s)}
            sx={{
              display: 'grid',
              placeItems: 'center',
              fontSize: 32,
              borderRadius: 1.5,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            title={s.name}
          >
            {s.content}
          </Box>
        ))}
      </Box>
    </Popover>
  )
}
