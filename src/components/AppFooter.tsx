import React, { useState, useEffect } from 'react'
import { getAppVersion, saveAppVersion } from '@/services/storageCleanup'
import { APP_VERSION, DEFAULT_THEME, TIME_CLOSE, ENABLE_CLOSING_COUNTDOWN } from '@/utils/const'

export const AppFooter: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>(APP_VERSION)
  const [isDark, setIsDark] = useState<boolean>(false)
  const [countdownText, setCountdownText] = useState<string>('')

  const calculateCountdown = () => {
    const target = new Date(TIME_CLOSE).getTime()
    const now = new Date().getTime()
    const diff = target - now

    if (diff <= 0) {
      setCountdownText('Time up!')
      return
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    const daysStr = days > 0 ? `${days}d ` : ''
    const hoursStr = String(hours).padStart(2, '0') + 'h '
    const minutesStr = String(minutes).padStart(2, '0') + 'm '
    const secondsStr = String(seconds).padStart(2, '0') + 's'

    setCountdownText(`${daysStr}${hoursStr}${minutesStr}${secondsStr}`)
  }

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    localStorage.setItem('theme', nextDark ? 'dark' : 'light')
    if (nextDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    const savedVersion = getAppVersion()
    if (savedVersion && savedVersion === APP_VERSION) {
      setAppVersion(savedVersion)
    } else {
      setAppVersion(APP_VERSION)
      saveAppVersion()
    }

    const savedTheme = localStorage.getItem('theme') || DEFAULT_THEME
    const darkActive = savedTheme === 'dark'
    setIsDark(darkActive)
    if (darkActive) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    if (ENABLE_CLOSING_COUNTDOWN) {
      calculateCountdown()
      const timerInterval = setInterval(calculateCountdown, 1000)
      return () => clearInterval(timerInterval)
    }
  }, [])

  return (
    <div className="app-footer">
      <footer className="bg-surface d-flex align-center justify-between" style={{ minHeight: '40px', padding: '0 16px' }}>
        <div className="d-flex align-center">
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '4px',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <i className={`mdi ${isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'}`}></i>
          </button>
        </div>
        <div className="text-center flex-grow-1">
          <span className="footer-text">
            <span className="version-label">v</span> {appVersion}
          </span>
        </div>
        {ENABLE_CLOSING_COUNTDOWN && (
          <div className="d-flex align-center">
            <span className="footer-text countdown-container">
              <i className="mdi mdi-timer-outline countdown-icon mr-1" style={{ fontSize: '0.9rem' }}></i>
              {countdownText}
            </span>
          </div>
        )}
      </footer>
    </div>
  )
}

export default AppFooter
