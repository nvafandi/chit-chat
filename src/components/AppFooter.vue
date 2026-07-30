<template>
  <div class="app-footer">
    <v-footer class="bg-surface">
      <v-row class="footer-content" no-gutters>
        <v-col cols="auto" class="d-flex align-center pl-4">
          <v-btn
            icon
            size="x-small"
            @click="toggleTheme"
            class="theme-toggle"
            :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <v-icon>{{ isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}</v-icon>
          </v-btn>
        </v-col>
        <v-col class="text-center py-2">
          <span class="footer-text">
            <span class="version-label">v</span> {{ appVersion }}
          </span>
        </v-col>
        <v-col v-if="ENABLE_CLOSING_COUNTDOWN" cols="auto" class="d-flex align-center pr-4">
          <span class="footer-text countdown-container">
            <v-icon size="x-small" class="countdown-icon mr-1">mdi-timer-outline</v-icon>
            {{ countdownText }}
          </span>
        </v-col>
      </v-row>
    </v-footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useTheme } from 'vuetify'
import { getAppVersion, saveAppVersion } from '@/services/storageCleanup'
import { APP_VERSION, DEFAULT_THEME, TIME_CLOSE, ENABLE_CLOSING_COUNTDOWN } from '@/utils/const'

const appVersion = ref<string>(APP_VERSION)
const theme = useTheme()
const isDark = ref<boolean>(false)
const countdownText = ref<string>('')
let timerInterval: ReturnType<typeof setInterval> | null = null

const calculateCountdown = () => {
  const target = new Date(TIME_CLOSE).getTime()
  const now = new Date().getTime()
  const diff = target - now

  if (diff <= 0) {
    countdownText.value = 'Time up!'
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
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

  countdownText.value = `${daysStr}${hoursStr}${minutesStr}${secondsStr}`
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  theme.change(isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  
  // Apply dark class to document root
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

onMounted(() => {
  // Sync stale version in localStorage with current app version.
  const savedVersion = getAppVersion()
  if (savedVersion && savedVersion === APP_VERSION) {
    appVersion.value = savedVersion
  } else {
    appVersion.value = APP_VERSION
    saveAppVersion()
  }

  // Check current theme
  const savedTheme = localStorage.getItem('theme') || DEFAULT_THEME
  isDark.value = savedTheme === 'dark'
  theme.change(savedTheme)
  
  // Apply dark class to document root on mount
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  // Start countdown timer
  if (ENABLE_CLOSING_COUNTDOWN) {
    calculateCountdown()
    timerInterval = setInterval(calculateCountdown, 1000)
  }
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.app-footer {
  width: 100%;
  flex-shrink: 0;
  border-top: 2px solid var(--clr-primary-a20);
  transition: background 0.3s, color 0.3s, border-color 0.3s;
  background-color: var(--clr-surface-a0);
}

:global(html.dark) .app-footer {
  border-top-color: var(--clr-primary-a20);
  background-color: var(--clr-surface-a10);
}

.footer-content {
  width: 100%;
  align-items: center;
}

.footer-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
  transition: color 0.3s;
}

.version-label {
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s;
}

.theme-toggle {
  transition: color 0.3s ease, background 0.3s;
}

:deep(.v-footer) {
  padding: 0;
  min-height: 40px;
  display: flex;
  align-items: center;
  background-color: var(--bg-secondary);
  transition: background-color 0.3s;
}

/* Hide theme toggle on mobile (shown in header instead) */
@media (max-width: 640px) {
  .theme-toggle {
    display: none;
  }
}

.countdown-container {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: var(--clr-surface-a10);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
  user-select: none;
  animation: bomb-tick 1s infinite ease-out;
}

:global(html.dark) .countdown-container {
  background-color: var(--clr-surface-tonal-a10);
  border-color: var(--clr-primary-a20);
}

.countdown-container:hover {
  background-color: var(--clr-surface-tonal-a0);
  border-color: var(--clr-danger-a10);
}

.countdown-icon {
  color: inherit;
  animation: icon-scale 1s infinite ease-out;
}

@keyframes bomb-tick {
  0% {
    border-color: var(--clr-danger-a10);
    background-color: rgba(217, 74, 74, 0.15);
    box-shadow: 0 0 8px rgba(217, 74, 74, 0.5);
    color: var(--clr-danger-a10);
  }
  15% {
    border-color: var(--clr-danger-a10);
    background-color: rgba(217, 74, 74, 0.15);
    box-shadow: 0 0 8px rgba(217, 74, 74, 0.5);
    color: var(--clr-danger-a10);
  }
  100% {
    border-color: var(--border);
  }
}

@keyframes icon-scale {
  0% {
    transform: scale(1.2);
  }
  15% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
