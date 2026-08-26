import { useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import AuthPage from '@/pages/AuthPage'
import ChatPage from '@/pages/ChatPage'
import AppGate from '@/components/AppGate'

export default function App() {
  const { user, restoreSession, isLoading } = useAuthStore()
  const connect = useChatStore((s) => s.connect)
  const disconnect = useChatStore((s) => s.disconnect)
  const mode = useThemeStore((s) => s.mode)

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
