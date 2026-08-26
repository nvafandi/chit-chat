import { Box, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function ImageViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Box
      onClick={onClose}
      sx={{ position: 'fixed', inset: 0, zIndex: 3000, bgcolor: 'rgba(0,0,0,0.93)', display: 'grid', placeItems: 'center', cursor: 'zoom-out' }}
    >
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', top: 16, right: 20, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}
      >
        <CloseIcon />
      </IconButton>
      <Box
        component="img"
        src={url}
        onClick={(e) => e.stopPropagation()}
        sx={{ maxWidth: '94vw', maxHeight: '92vh', objectFit: 'contain', cursor: 'default' }}
      />
    </Box>
  )
}
