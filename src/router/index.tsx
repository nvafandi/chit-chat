import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { validateSession } from '@/services/session'
import { clearAllStorage } from '@/services/storageCleanup'
import CreateAccount from '@/views/CreateAccount'
import Chat from '@/views/Chat'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authStore = useAuthStore()
  
  useEffect(() => {
    authStore.initializeAuth()
  }, [])

  const isAuthenticated = authStore.user !== null || validateSession()

  if (!isAuthenticated || !validateSession()) {
    if (isAuthenticated) {
      console.warn('[Router] Session expired.')
      clearAllStorage()
    }
    return <Navigate to="/create-account" replace />
  }

  return <>{children}</>
}

export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authStore = useAuthStore()

  useEffect(() => {
    authStore.initializeAuth()
  }, [])

  const isAuthenticated = authStore.user !== null || validateSession()

  if (isAuthenticated && validateSession()) {
    return <Navigate to="/chat" replace />
  }

  return <>{children}</>
}

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route
        path="/create-account"
        element={
          <GuestRoute>
            <CreateAccount />
          </GuestRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}
