import React, { useState, useEffect, useMemo } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { validateSession } from '@/services/session'
import { registerServiceWorker } from '@/services/serviceWorkerManager'
import AppFooter from '@/components/AppFooter'
import FireworksOverlay from '@/components/FireworksOverlay'
import { AppRoutes } from '@/router'
import { 
  COOKIE_CHECK_INTERVAL, 
  ENABLE_OPENING_COUNTDOWN,
  ENABLE_CLOSING_COUNTDOWN,
  TIME_OPEN,
  TIME_CLOSE,
  OPENING_TEXT_MAIN,
  OPENING_TEXT_SUB,
  CLOSING_TEXT_MAIN,
  CLOSING_TEXT_SUB,
  CLOSING_TEXT_DESC
} from '@/utils/const'

export const App: React.FC = () => {
  const [isTimeOpen, setIsTimeOpen] = useState<boolean>(false)
  const [isTimeClose, setIsTimeClose] = useState<boolean>(false)
  const [lockTime, setLockTime] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00'
  })

  const appPhase = useMemo(() => {
    if (ENABLE_OPENING_COUNTDOWN && !isTimeOpen) {
      return 'locked'
    }
    if (ENABLE_CLOSING_COUNTDOWN && isTimeClose) {
      return 'closed'
    }
    return 'active'
  }, [isTimeOpen, isTimeClose])

  const formattedTargetDate = useMemo(() => {
    const date = new Date(TIME_OPEN)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }, [])

  useEffect(() => {
    let phaseInterval: ReturnType<typeof setInterval> | null = null
    let checkInterval: ReturnType<typeof setInterval> | null = null

    const checkAppPhases = () => {
      const now = Date.now()
      const openTarget = new Date(TIME_OPEN).getTime()
      const closeTarget = new Date(TIME_CLOSE).getTime()

      if (!ENABLE_OPENING_COUNTDOWN || now >= openTarget) {
        setIsTimeOpen(true)
      } else {
        setIsTimeOpen(false)
        const diff = openTarget - now
        const d = Math.floor(diff / (1000 * 60 * 60 * 24))
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        
        setLockTime({
          days: String(d).padStart(2, '0'),
          hours: String(h).padStart(2, '0'),
          minutes: String(m).padStart(2, '0'),
          seconds: String(s).padStart(2, '0')
        })
      }

      if (ENABLE_CLOSING_COUNTDOWN && now >= closeTarget) {
        setIsTimeClose(true)
        if (phaseInterval) {
          clearInterval(phaseInterval)
          phaseInterval = null
        }
      } else {
        setIsTimeClose(false)
      }
    }

    const initGlobalAudio = () => {
      if (!(window as any).sharedAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
          (window as any).sharedAudioCtx = new AudioContextClass()
        }
      }
      const ctx = (window as any).sharedAudioCtx
      if (ctx && ctx.state === 'suspended') {
        ctx.resume()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && window.location.pathname === '/chat') {
        if (!validateSession()) {
          console.warn('[App] Session expired while tab was hidden')
          window.location.href = '/create-account'
        }
      }
    }

    window.addEventListener('click', initGlobalAudio)
    window.addEventListener('touchstart', initGlobalAudio)
    window.addEventListener('keydown', initGlobalAudio)
    window.addEventListener('mousemove', initGlobalAudio)
    window.addEventListener('scroll', initGlobalAudio)
    
    initGlobalAudio()

    if (ENABLE_OPENING_COUNTDOWN || ENABLE_CLOSING_COUNTDOWN) {
      checkAppPhases()
      phaseInterval = setInterval(checkAppPhases, 1000)
    }

    registerServiceWorker()
      .then((reg) => {
        if (reg) console.log('[App] Service Worker registered')
      })
      .catch((err) => {
        console.error('[App] Service Worker registration failed:', err)
      })

    if (window.location.pathname === '/chat') {
      checkInterval = setInterval(() => {
        if (!validateSession()) {
          console.warn('[App] Session expired during background check')
        }
      }, COOKIE_CHECK_INTERVAL)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('click', initGlobalAudio)
      window.removeEventListener('touchstart', initGlobalAudio)
      window.removeEventListener('keydown', initGlobalAudio)
      window.removeEventListener('mousemove', initGlobalAudio)
      window.removeEventListener('scroll', initGlobalAudio)
      if (phaseInterval) clearInterval(phaseInterval)
      if (checkInterval) clearInterval(checkInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <BrowserRouter basename="/chit-chat">
      <div className="app-container">
        <style dangerouslySetInnerHTML={{ __html: `
          .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            transition: background 0.3s, color 0.3s;
          }
          .app-layout {
            display: flex;
            flex-direction: column;
            flex: 1;
            background-color: var(--bg-primary);
            transition: background 0.3s, color 0.3s;
            overflow: hidden;
          }
          .router-view {
            flex: 1;
            overflow-y: auto;
            background-color: var(--bg-primary);
            transition: background 0.3s, color 0.3s;
          }
          .app-lock-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #05050b;
            background-image: 
              radial-gradient(circle at 20% 30%, rgba(99, 30, 253, 0.15) 0%, transparent 40%),
              radial-gradient(circle at 80% 70%, rgba(225, 18, 162, 0.12) 0%, transparent 40%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
          }
          .lock-card {
            text-align: center;
            padding: 3rem 4rem;
            background: rgba(10, 10, 18, 0.55);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 32px;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6),
                        0 0 50px rgba(99, 30, 253, 0.15);
            max-width: 90%;
            animation: float-lock 6s infinite ease-in-out;
          }
          .lock-icon {
            color: var(--clr-primary-a10);
            filter: drop-shadow(0 0 10px rgba(99, 30, 253, 0.5));
            animation: pulse-lock-icon 2s infinite ease-in-out;
            font-size: 48px;
            margin-bottom: 16px;
            display: inline-block;
          }
          .lock-title {
            font-size: 3.5rem;
            font-weight: 900;
            letter-spacing: -1.5px;
            background: linear-gradient(45deg, #ff2a6d, #f8e71c, #05d9e8, #ff2a6d);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: gradient-flow-lock 6s ease infinite;
            margin-bottom: 0.5rem;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .lock-subtitle {
            color: var(--clr-surface-a50);
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 2.5rem;
          }
          .lock-timer {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1.2rem;
            margin-bottom: 2.5rem;
          }
          .timer-segment {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .timer-value {
            font-size: 3rem;
            font-weight: 800;
            font-family: 'Courier New', monospace;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 16px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
            min-width: 80px;
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
          }
          .timer-label {
            font-size: 0.75rem;
            color: var(--clr-surface-a40);
            text-transform: uppercase;
            margin-top: 0.5rem;
            font-weight: 600;
            letter-spacing: 1px;
          }
          .timer-separator {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--clr-primary-a20);
            text-shadow: 0 0 10px rgba(99, 30, 253, 0.5);
            margin-top: -1.5rem;
          }
          .lock-footer {
            font-size: 0.85rem;
            color: var(--clr-surface-a50);
            letter-spacing: 0.5px;
          }
          @keyframes float-lock {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes pulse-lock-icon {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          @keyframes gradient-flow-lock {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @media (max-width: 640px) {
            .lock-card { padding: 2rem 1.5rem; }
            .lock-title { font-size: 2.5rem; }
            .lock-timer { gap: 0.5rem; }
            .timer-value { font-size: 2rem; min-width: 60px; padding: 6px 10px; }
            .timer-separator { font-size: 1.5rem; }
          }
        ` }} />

        {appPhase === 'locked' ? (
          <div className="app-lock-screen">
            <div className="lock-card">
              <span className="lock-icon"><i className="mdi mdi-lock-outline"></i></span>
              <h1 className="lock-title">{OPENING_TEXT_MAIN}</h1>
              <p className="lock-subtitle">{OPENING_TEXT_SUB}</p>
              
              <div className="lock-timer">
                <div className="timer-segment">
                  <span className="timer-value">{lockTime.days}</span>
                  <span className="timer-label">Days</span>
                </div>
                <div className="timer-separator">:</div>
                <div className="timer-segment">
                  <span className="timer-value">{lockTime.hours}</span>
                  <span className="timer-label">Hours</span>
                </div>
                <div className="timer-separator">:</div>
                <div className="timer-segment">
                  <span className="timer-value">{lockTime.minutes}</span>
                  <span className="timer-label">Mins</span>
                </div>
                <div className="timer-separator">:</div>
                <div className="timer-segment">
                  <span className="timer-value">{lockTime.seconds}</span>
                  <span className="timer-label">Secs</span>
                </div>
              </div>
              
              <p className="lock-footer">App will unlock on {formattedTargetDate}</p>
            </div>
          </div>
        ) : appPhase === 'closed' ? (
          <FireworksOverlay 
            mainText={CLOSING_TEXT_MAIN}
            subText={CLOSING_TEXT_SUB}
            descText={CLOSING_TEXT_DESC}
            showCloseButton={false}
            linkUrl="https://chitchut-v2.web.app/"
            linkText="Open Chit-Chut V2"
          />
        ) : (
          <>
            <div className="app-layout">
              <div className="router-view">
                <AppRoutes />
              </div>
            </div>
            <AppFooter />
          </>
        )}
      </div>
    </BrowserRouter>
  )
}

export default App
