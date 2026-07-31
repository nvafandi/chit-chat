import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { 
  loginUser, 
  registerUser, 
  getUserByUsername, 
  getMessages, 
  hideMessage, 
  cleanMessages, 
  cleanUsers 
} from '@/services/firebase'
import { cleanAllStorage as cleanSupabaseStorage } from '@/services/supabase'
import { clearAllStorage, saveAppVersion } from '@/services/storageCleanup'
import { attemptMigrationFromLocalStorage } from '@/services/session'
import { getRandomAnimal } from '@/utils/animals'

export const CreateAccount: React.FC = () => {
  const navigate = useNavigate()
  const authStore = useAuthStore()

  const [currentTab, setCurrentTab] = useState<'login' | 'register'>('login')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginErrors, setLoginErrors] = useState({ username: '', password: '' })

  const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '' })
  const [registerErrors, setRegisterErrors] = useState({ username: '', password: '', confirmPassword: '' })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState(false)
  const [randomAnimal, setRandomAnimal] = useState<string | null>(null)

  const [toast, setToast] = useState({ show: false, message: '', color: 'success' })
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (message: string, color: string = 'success') => {
    setToast({ show: true, message, color })
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }))
    }, 3000)
  }

  // Handle checking username availability
  useEffect(() => {
    if (currentTab !== 'register') return

    const username = registerForm.username.trim()
    if (username.length < 3) {
      setUsernameAvailable(false)
      setRandomAnimal(null)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setIsCheckingUsername(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const user = await getUserByUsername(username)
        const available = !user
        setUsernameAvailable(available)
        
        if (available && username.length >= 3) {
          setRandomAnimal(getRandomAnimal())
        } else {
          setRandomAnimal(null)
        }
      } catch (err) {
        console.error('Error checking username:', err)
        setUsernameAvailable(false)
        setRandomAnimal(null)
      } finally {
        setIsCheckingUsername(false)
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [registerForm.username, currentTab])

  // Clear Messages Handler
  const handleClearMessages = async () => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete all messages?')
      if (!confirmed) return
      await cleanMessages()
      showToast('✅ Messages cleared successfully!', 'success')
    } catch (err: any) {
      const message = err?.message || err?.toString() || 'Unknown error'
      showToast(`❌ Error clearing messages: ${message}`, 'error')
    }
  }

  // Clear Users & Messages Handler
  const handleClearUsers = async () => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete all users and messages?')
      if (!confirmed) return
      await cleanUsers()
      await cleanMessages()
      showToast('✅ Users and messages cleared successfully!', 'success')
    } catch (err: any) {
      const message = err?.message || err?.toString() || 'Unknown error'
      showToast(`❌ Error clearing users and messages: ${message}`, 'error')
    }
  }

  // Clear All Handler
  const handleClearAll = async () => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete ALL data? This cannot be undone!')
      if (!confirmed) return
      await cleanMessages()
      await cleanUsers()
      await cleanSupabaseStorage()
      showToast('✅ All data cleared successfully!', 'success')
    } catch (err: any) {
      const message = err?.message || err?.toString() || 'Unknown error'
      showToast(`❌ Error clearing all data: ${message}`, 'error')
    }
  }

  // Clear Supabase & Hide Messages with Files Handler
  const handleClearSupabaseAndHideMessages = async () => {
    try {
      const confirmed = window.confirm('Clear Supabase data and hide all messages with files? This cannot be undone!')
      if (!confirmed) return
      
      console.log('🧹 Starting Supabase cleanup and hiding file messages...')
      await cleanSupabaseStorage()
      console.log('✅ Supabase storage cleared')
      
      const allMessages = await getMessages()
      let hiddenCount = 0
      for (const message of allMessages) {
        if (!message.hidden && (message.imageUrl || message.fileUrl)) {
          try {
            await hideMessage(message.id)
            hiddenCount++
          } catch (error) {
            console.error(`Error hiding message ${message.id}:`, error)
          }
        }
      }
      showToast(`✅ Done! Supabase cleared & ${hiddenCount} file messages hidden`, 'success')
    } catch (err: any) {
      const message = err?.message || err?.toString() || 'Unknown error'
      showToast(`❌ Error: ${message}`, 'error')
    }
  }

  // LOGIN handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoginErrors({ username: '', password: '' })

    if (!loginForm.username.trim()) {
      setLoginErrors(prev => ({ ...prev, username: 'Username is required' }))
      return
    }
    if (!loginForm.password) {
      setLoginErrors(prev => ({ ...prev, password: 'Password is required' }))
      return
    }

    setIsLoading(true)
    try {
      clearAllStorage()
      attemptMigrationFromLocalStorage()
      saveAppVersion()

      const user = await loginUser(loginForm.username, loginForm.password)
      authStore.setUser(user)
      navigate('/chat')
    } catch (err: any) {
      setError(err?.message || 'Login failed')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // REGISTER handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setRegisterErrors({ username: '', password: '', confirmPassword: '' })

    if (!registerForm.username.trim()) {
      setRegisterErrors(prev => ({ ...prev, username: 'Username is required' }))
      return
    }
    if (registerForm.username.trim().length < 3) {
      setRegisterErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters' }))
      return
    }
    if (!usernameAvailable) {
      setRegisterErrors(prev => ({ ...prev, username: 'Username is already taken' }))
      return
    }
    if (!registerForm.password) {
      setRegisterErrors(prev => ({ ...prev, password: 'Password is required' }))
      return
    }
    if (registerForm.password.length < 3) {
      setRegisterErrors(prev => ({ ...prev, password: 'Password must be at least 3 characters' }))
      return
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }))
      return
    }

    setIsLoading(true)
    try {
      clearAllStorage()
      attemptMigrationFromLocalStorage()
      saveAppVersion()

      const user = await registerUser(
        registerForm.username,
        registerForm.password,
        randomAnimal || undefined
      )
      authStore.setUser(user)
      navigate('/chat')
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
      console.error('Registration error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="create-account-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .create-account-container {
          width: 100%;
          min-height: 100vh;
          background: var(--clr-surface-a0);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          transition: background 0.3s ease;
        }
        .auth-card {
          width: 100%;
          max-width: 380px;
          background: var(--clr-surface-a0);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          animation: slideInUp 0.6s ease-out;
          transition: background 0.3s ease, box-shadow 0.3s ease;
          border: 1px solid var(--border);
        }
        :global(html.dark) .auth-card {
          background: var(--clr-surface-a10);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        .avatar-section {
          background: linear-gradient(135deg, var(--clr-primary-a0) 0%, var(--clr-primary-a30) 100%);
          padding: 32px;
          text-align: center;
          position: relative;
        }
        .avatar-circle {
          width: 96px;
          height: 96px;
          background: rgba(255, 255, 255, 0.2);
          border: 3px solid rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          backdrop-filter: blur(10px);
          animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .avatar-circle i {
          font-size: 64px;
          color: white;
        }
        .no-wa-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 16px;
          letter-spacing: 2px;
          font-weight: 800;
          font-size: 1.5rem;
          color: white;
          position: relative;
        }
        .no-wa-char {
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s;
          user-select: none;
          min-width: 32px;
          text-align: center;
        }
        .no-wa-char:hover {
          background-color: rgba(255, 255, 255, 0.25);
          transform: scale(1.2);
        }
        .no-wa-c {
          opacity: 0;
          width: 0;
          overflow: hidden;
          padding: 0;
          transition: all 0.3s;
        }
        .no-wa-container:hover .no-wa-c {
          opacity: 1;
          width: 32px;
          padding: 6px 10px;
        }
        .auth-tabs {
          display: flex;
          background: var(--clr-surface-a10);
          border-bottom: 1px solid var(--border);
        }
        :global(html.dark) .auth-tabs {
          background: var(--clr-surface-a20);
        }
        .auth-tab-btn {
          flex: 1;
          padding: 12px;
          border: none;
          background: none;
          color: var(--text-primary);
          font-weight: 600;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .auth-tab-btn.active {
          border-bottom-color: var(--clr-primary-a0);
          color: var(--clr-primary-a0);
        }
        .auth-content {
          padding: 24px;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .input-field {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--clr-surface-a0);
          color: var(--text-primary);
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        :global(html.dark) .input-field {
          background: var(--clr-surface-a20);
        }
        .input-field:focus {
          border-color: var(--clr-primary-a0);
        }
        .input-field.error {
          border-color: var(--clr-danger-a10);
        }
        .error-message {
          color: var(--clr-danger-a10);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .login-btn {
          background: linear-gradient(135deg, var(--clr-primary-a0) 0%, var(--clr-primary-a30) 100%);
          color: white;
          font-weight: 700;
          padding: 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(225, 18, 162, 0.25);
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 1rem;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(225, 18, 162, 0.35);
        }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .animal-preview-card {
          background: var(--clr-surface-tonal-a0);
          border: 2px solid var(--clr-primary-a20);
          border-radius: 12px;
          padding: 12px;
          text-align: center;
          margin-bottom: 8px;
        }
        :global(html.dark) .animal-preview-card {
          background: var(--clr-surface-tonal-a10);
        }
        .alert-error {
          background: rgba(217, 74, 74, 0.15);
          color: var(--clr-danger-a10);
          border: 1px solid var(--clr-danger-a10);
          border-radius: 8px;
          padding: 12px;
          font-size: 0.9rem;
          position: relative;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 16px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .chip.success {
          background: rgba(40, 190, 138, 0.15);
          color: var(--clr-success-a0);
        }
        .chip.error {
          background: rgba(217, 74, 74, 0.15);
          color: var(--clr-danger-a10);
        }
        .toast-notification {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100000;
          background: var(--clr-surface-a20);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
      ` }} />

      {toast.show && (
        <div className="toast-notification">
          {toast.message}
        </div>
      )}

      <div className="auth-card">
        <div className="avatar-section">
          <div className="avatar-circle">
            <i className="mdi mdi-account-circle"></i>
          </div>
          
          <div className="no-wa-container">
            <span className="no-wa-char no-wa-n" onClick={handleClearMessages} title="Clear Messages">N</span>
            <span className="no-wa-char" title="NO WA">O</span>
            <span className="no-wa-char no-wa-w" onClick={handleClearUsers} title="Clear Users & Messages">W</span>
            <span className="no-wa-char no-wa-a" onClick={handleClearSupabaseAndHideMessages} title="Clear Supabase Storage & Hide Messages with files">A</span>
            <span className="no-wa-char no-wa-c" onClick={handleClearAll} title="Clear All Data">C</span>
          </div>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab-btn ${currentTab === 'login' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('login'); setError(null); }}
          >
            LOGIN
          </button>
          <button 
            className={`auth-tab-btn ${currentTab === 'register' ? 'active' : ''}`}
            onClick={() => { setCurrentTab('register'); setError(null); }}
          >
            REGISTER
          </button>
        </div>

        <div className="auth-content">
          {currentTab === 'login' ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="input-group">
                <input
                  type="text"
                  className={`input-field ${loginErrors.username ? 'error' : ''}`}
                  placeholder="USERNAME"
                  disabled={isLoading}
                  value={loginForm.username}
                  onChange={(e) => {
                    setLoginForm(prev => ({ ...prev, username: e.target.value }))
                    setLoginErrors(prev => ({ ...prev, username: '' }))
                  }}
                />
                {loginErrors.username && <span className="error-message">{loginErrors.username}</span>}
              </div>

              <div className="input-group">
                <input
                  type="password"
                  className={`input-field ${loginErrors.password ? 'error' : ''}`}
                  placeholder="PASSWORD"
                  disabled={isLoading}
                  value={loginForm.password}
                  onChange={(e) => {
                    setLoginForm(prev => ({ ...prev, password: e.target.value }))
                    setLoginErrors(prev => ({ ...prev, password: '' }))
                  }}
                />
                {loginErrors.password && <span className="error-message">{loginErrors.password}</span>}
              </div>

              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? 'LOADING...' : 'LOGIN'} <i className="mdi mdi-arrow-right"></i>
              </button>

              {error && (
                <div className="alert-error">
                  <i className="mdi mdi-alert-circle mr-2"></i> {error}
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="input-group">
                <input
                  type="text"
                  className={`input-field ${registerErrors.username ? 'error' : ''}`}
                  placeholder="USERNAME"
                  disabled={isLoading}
                  value={registerForm.username}
                  onChange={(e) => {
                    setRegisterForm(prev => ({ ...prev, username: e.target.value }))
                    setRegisterErrors(prev => ({ ...prev, username: '' }))
                  }}
                />
                {registerErrors.username && <span className="error-message">{registerErrors.username}</span>}
              </div>

              {registerForm.username.length >= 3 && (
                <div style={{ marginBottom: '8px' }}>
                  {isCheckingUsername ? (
                    <span className="chip"><i className="mdi mdi-loading mdi-spin mr-1"></i> Checking...</span>
                  ) : usernameAvailable ? (
                    <span className="chip success"><i className="mdi mdi-check-circle mr-1"></i> Available</span>
                  ) : (
                    <span className="chip error"><i className="mdi mdi-close-circle mr-1"></i> Taken</span>
                  )}
                </div>
              )}

              <div className="input-group">
                <input
                  type="password"
                  className={`input-field ${registerErrors.password ? 'error' : ''}`}
                  placeholder="PASSWORD"
                  disabled={isLoading}
                  value={registerForm.password}
                  onChange={(e) => {
                    setRegisterForm(prev => ({ ...prev, password: e.target.value }))
                    setRegisterErrors(prev => ({ ...prev, password: '' }))
                  }}
                />
                {registerErrors.password && <span className="error-message">{registerErrors.password}</span>}
              </div>

              <div className="input-group">
                <input
                  type="password"
                  className={`input-field ${registerErrors.confirmPassword ? 'error' : ''}`}
                  placeholder="CONFIRM PASSWORD"
                  disabled={isLoading}
                  value={registerForm.confirmPassword}
                  onChange={(e) => {
                    setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))
                    setRegisterErrors(prev => ({ ...prev, confirmPassword: '' }))
                  }}
                />
                {registerErrors.confirmPassword && <span className="error-message">{registerErrors.confirmPassword}</span>}
              </div>

              {randomAnimal && registerForm.username.length >= 3 && (
                <div className="animal-preview-card">
                  <div className="d-flex align-center justify-center" style={{ gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{randomAnimal}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{registerForm.username}</div>
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="login-btn" disabled={isLoading || !usernameAvailable || isCheckingUsername}>
                {isLoading ? 'LOADING...' : 'CREATE ACCOUNT'} <i className="mdi mdi-account-plus"></i>
              </button>

              {error && (
                <div className="alert-error">
                  <i className="mdi mdi-alert-circle mr-2"></i> {error}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateAccount
