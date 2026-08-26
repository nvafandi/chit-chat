import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline, IconButton } from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import AuthPage from '@/pages/AuthPage'
import ChatPage from '@/pages/ChatPage'
import AppGate from '@/components/AppGate'

export default function App() {
  const { user, restoreSession, isLoading } = useAuthStore()
  const connect = useChatStore((s) => s.connect)
  const disconnect = useChatStore((s) => s.disconnect)
  const [mode, setMode] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  )

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (user) {
      connect(user.id)
      return () => disconnect()
    }
  }, [user, connect, disconnect])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#641efd' },
          secondary: { main: '#e112a2' },
          background: mode === 'dark' ? { default: '#121212', paper: '#1d1626' } : {},
        },
      }),
    [mode]
  )

  function toggleMode() {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem('theme', next)
  }

  if (isLoading && !user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
          <div className="spinner" />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <AppGate>
      <CssBaseline />
      <IconButton
        onClick={toggleMode}
        sx={{ position: 'fixed', top: 12, right: 16, zIndex: 2000 }}
        size="small"
      >
        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
      <BrowserRouter>
        <Routes>
          <Route path="/chat" element={user ? <ChatPage /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/chat" replace />} />
          <Route path="*" element={<Navigate to={user ? '/chat' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
      </AppGate>
    </ThemeProvider>
  )
}
