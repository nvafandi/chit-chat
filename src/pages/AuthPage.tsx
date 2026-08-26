import { Container, Paper, Typography, Button, Alert, Box, Stack } from '@mui/material'
import GoogleIcon from './GoogleIcon'
import GitHubIcon from '@mui/icons-material/GitHub'
import { useAuthStore } from '@/stores/authStore'
import { cleanMessages, cleanUsers } from '@/services/firebase'
import { cleanAllStorage } from '@/services/supabase'
import type { SocialProvider } from '@/services/authService'

export default function AuthPage() {
  const { login, isLoading, error } = useAuthStore()

  async function handleLogin(provider: SocialProvider) {
    await login(provider)
  }

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Paper elevation={6} sx={{ width: '100%', p: 4, borderRadius: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom color="primary" sx={{ fontWeight: 800 }}>
          CHIT CHuT
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Masuk untuk mulai ngobrol
        </Typography>

        <Stack spacing={1.5}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={() => handleLogin('google')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            Lanjutkan dengan Google
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<GitHubIcon />}
            onClick={() => handleLogin('github')}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            Lanjutkan dengan GitHub
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <div className="spinner" />
          </Box>
        )}

        <AdminCleanup />
      </Paper>
    </Container>
  )
}

function AdminCleanup() {
  const actions: Record<string, [string, () => Promise<void>]> = {
    N: ['Hapus semua pesan', async () => void (await cleanMessages())],
    O: ['Tidak ada aksi', async () => {}],
    W: ['Hapus semua user', async () => void (await cleanUsers())],
    A: ['Hapus semua file storage', async () => void (await cleanAllStorage())],
  }

  async function run(letter: string) {
    const [desc, fn] = actions[letter]
    if (!window.confirm(`ADMIN: ${desc}?\nTindakan ini tidak bisa dibatalkan.`)) return
    await fn()
    window.alert('Selesai.')
  }

  return (
    <Box
      sx={{
        mt: 3,
        display: 'flex',
        justifyContent: 'center',
        gap: 0.5,
        opacity: 0.15,
        '&:hover': { opacity: 0.6 },
      }}
    >
      {Object.keys(actions).map((letter) => (
        <Box
          key={letter}
          onClick={() => run(letter)}
          sx={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, px: 0.5, userSelect: 'none' }}
          title={actions[letter][0]}
        >
          {letter}
        </Box>
      ))}
    </Box>
  )
}
