<template>
  <v-app class="app-container">
    <!-- PHASE 1: LOCKED (WAITING FOR OPENING) -->
    <div v-if="appPhase === 'locked'" class="app-lock-screen">
      <div class="lock-card">
        <v-icon size="48" class="lock-icon mb-4">mdi-lock-outline</v-icon>
        <h1 class="lock-title">{{ OPENING_TEXT_MAIN }}</h1>
        <p class="lock-subtitle">{{ OPENING_TEXT_SUB }}</p>
        
        <div class="lock-timer">
          <div class="timer-segment">
            <span class="timer-value">{{ lockTime.days }}</span>
            <span class="timer-label">Days</span>
          </div>
          <div class="timer-separator">:</div>
          <div class="timer-segment">
            <span class="timer-value">{{ lockTime.hours }}</span>
            <span class="timer-label">Hours</span>
          </div>
          <div class="timer-separator">:</div>
          <div class="timer-segment">
            <span class="timer-value">{{ lockTime.minutes }}</span>
            <span class="timer-label">Mins</span>
          </div>
          <div class="timer-separator">:</div>
          <div class="timer-segment">
            <span class="timer-value">{{ lockTime.seconds }}</span>
            <span class="timer-label">Secs</span>
          </div>
        </div>
        
        <p class="lock-footer">App will unlock on {{ formattedTargetDate }}</p>
      </div>
    </div>
    
    <!-- PHASE 3: CLOSED (PERMANENT CELEBRATION SHOW) -->
    <FireworksOverlay 
      v-else-if="appPhase === 'closed'" 
      :main-text="CLOSING_TEXT_MAIN"
      :sub-text="CLOSING_TEXT_SUB"
      :desc-text="CLOSING_TEXT_DESC"
      :show-close-button="false"
      link-url="https://chitchut-v2.web.app/"
      link-text="Open Chit-Chut V2"
    />
    
    <!-- PHASE 2: ACTIVE (NORMAL APP) -->
    <template v-else>
      <div class="app-layout">
        <router-view class="router-view" />
      </div>
      <AppFooter />
    </template>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { validateSession } from '@/services/session'
import { registerServiceWorker } from '@/services/serviceWorkerManager'
import { useRouter } from 'vue-router'
import AppFooter from '@/components/AppFooter.vue'
import FireworksOverlay from '@/components/FireworksOverlay.vue'
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

const router = useRouter()
let checkInterval: ReturnType<typeof setInterval> | null = null
let phaseCheckInterval: ReturnType<typeof setInterval> | null = null

const isTimeOpen = ref<boolean>(false)
const isTimeClose = ref<boolean>(false)

const appPhase = computed(() => {
  if (ENABLE_OPENING_COUNTDOWN && !isTimeOpen.value) {
    return 'locked'
  }
  if (ENABLE_CLOSING_COUNTDOWN && isTimeClose.value) {
    return 'closed'
  }
  return 'active'
})

const lockTime = ref({
  days: '00',
  hours: '00',
  minutes: '00',
  seconds: '00'
})

const formattedTargetDate = computed(() => {
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
})

function checkAppPhases(): void {
  const now = Date.now()
  const openTarget = new Date(TIME_OPEN).getTime()
  const closeTarget = new Date(TIME_CLOSE).getTime()

  // 1. Check opening
  if (!ENABLE_OPENING_COUNTDOWN || now >= openTarget) {
    isTimeOpen.value = true
  } else {
    isTimeOpen.value = false
    const diff = openTarget - now
    const d = Math.floor(diff / (1000 * 60 * 60 * 24))
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const s = Math.floor((diff % (1000 * 60)) / 1000)
    
    lockTime.value = {
      days: String(d).padStart(2, '0'),
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0')
    }
  }

  // 2. Check closing
  if (ENABLE_CLOSING_COUNTDOWN && now >= closeTarget) {
    isTimeClose.value = true
  } else {
    isTimeClose.value = false
  }

  // Clear check timer if app is fully closed
  if (isTimeClose.value && phaseCheckInterval) {
    clearInterval(phaseCheckInterval)
    phaseCheckInterval = null
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



function handleVisibilityChange(): void {
  // Only check when user returns to tab if on chat page
  if (
    document.visibilityState === 'visible' &&
    router.currentRoute.value.path === '/chat'
  ) {
    if (!validateSession()) {
      console.warn('[App] Session expired while tab was hidden')
      router.push('/create-account')
    }
  }
}

onMounted(() => {
  // Unlock audio globally on any user interaction
  window.addEventListener('click', initGlobalAudio)
  window.addEventListener('touchstart', initGlobalAudio)
  window.addEventListener('keydown', initGlobalAudio)
  window.addEventListener('mousemove', initGlobalAudio)
  window.addEventListener('scroll', initGlobalAudio)
  
  // Try to initialize immediately
  initGlobalAudio()

  // Check target times & app phases
  if (ENABLE_OPENING_COUNTDOWN || ENABLE_CLOSING_COUNTDOWN) {
    checkAppPhases()
    if (!isTimeClose.value) {
      phaseCheckInterval = setInterval(checkAppPhases, 1000)
    }
  }

  // Register service worker for background notifications
  registerServiceWorker()
    .then((registration) => {
      if (registration) {
        console.log('[App] Service Worker registered for background notifications')
      }
    })
    .catch((err) => {
      console.error('[App] Service Worker registration failed:', err)
    })

  // Setup periodic check (only for background monitoring while user active)
  // Main validation happens in router guard
  if (router.currentRoute.value.path === '/chat') {
    checkInterval = setInterval(() => {
      // Background check - only log if session expires
      if (!validateSession()) {
        console.warn('[App] Session expired during background check')
        // Router guard will handle redirect on next interaction
      }
    }, COOKIE_CHECK_INTERVAL)
  }

  // Check when page visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  // Cleanup
  if (checkInterval) {
    clearInterval(checkInterval)
  }
  if (phaseCheckInterval) {
    clearInterval(phaseCheckInterval)
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('click', initGlobalAudio)
  window.removeEventListener('touchstart', initGlobalAudio)
  window.removeEventListener('keydown', initGlobalAudio)
  window.removeEventListener('mousemove', initGlobalAudio)
  window.removeEventListener('scroll', initGlobalAudio)
})
</script>

<style scoped>
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

/* LOCK SCREEN STYLING */
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  .lock-card {
    padding: 2rem 1.5rem;
  }
  .lock-title {
    font-size: 2.5rem;
  }
  .lock-timer {
    gap: 0.5rem;
  }
  .timer-value {
    font-size: 2rem;
    min-width: 60px;
    padding: 6px 10px;
  }
  .timer-separator {
    font-size: 1.5rem;
  }
}
</style>
