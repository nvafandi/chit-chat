<template>
  <div class="create-account-container">
    <v-container class="fill-height d-flex align-center justify-center auth-container">
      <div class="auth-card">
        <!-- Avatar Profile Section -->
        <div class="avatar-section">
          <div class="avatar-circle">
            <v-icon size="64" class="text-white">mdi-account-circle</v-icon>
          </div>
          
          <!-- Hidden Buttons in 'NO WA' -->
          <div class="no-wa-container">
            <v-tooltip text="Clear Messages" location="bottom">
              <template v-slot:activator="{ props }">
                <span class="no-wa-char no-wa-n" @click="handleClearMessages" v-bind="props">N</span>
              </template>
            </v-tooltip>
            <span class="no-wa-char">O</span>
            <v-tooltip text="Clear Users & Messages" location="bottom">
              <template v-slot:activator="{ props }">
                <span class="no-wa-char no-wa-w" @click="handleClearUsers" v-bind="props">W</span>
              </template>
            </v-tooltip>
            <v-tooltip text="Clear Supabase & Delete Related Messages" location="bottom">
              <template v-slot:activator="{ props }">
                <span class="no-wa-char no-wa-a" @click="handleClearSupabaseAndHideMessages" v-bind="props">A</span>
              </template>
            </v-tooltip>
            <v-tooltip text="Clear All Data" location="bottom">
              <template v-slot:activator="{ props }">
                <span class="no-wa-char no-wa-c" @click="handleClearAll" v-bind="props">C</span>
              </template>
            </v-tooltip>
          </div>
        </div>

        <!-- Tabs for Login / Register -->
        <v-tabs v-model="currentTab" class="auth-tabs" color="primary">
          <v-tab value="login">LOGIN</v-tab>
          <v-tab value="register">REGISTER</v-tab>
        </v-tabs>

        <div class="auth-content">
          <!-- LOGIN TAB -->
          <v-window v-model="currentTab">
            <v-window-item value="login">
              <v-form @submit.prevent="handleLogin" class="auth-form">
                <!-- Username Field -->
                <v-text-field
                  v-model="loginForm.username"
                  variant="outlined"
                  density="compact"
                  :disabled="isLoading"
                  :error="!!loginErrors.username"
                  :error-messages="loginErrors.username"
                  @input="loginErrors.username = ''"
                  placeholder="USERNAME"
                />

                <!-- Password Field -->
                <v-text-field
                  v-model="loginForm.password"
                  type="password"
                  variant="outlined"
                  density="compact"
                  :disabled="isLoading"
                  :error="!!loginErrors.password"
                  :error-messages="loginErrors.password"
                  @input="loginErrors.password = ''"
                  @keyup.enter="handleLogin"
                  placeholder="PASSWORD"
                />

                <!-- Login Button -->
                <v-btn
                  type="submit"
                  block
                  size="large"
                  :loading="isLoading"
                  class="login-btn"
                  append-icon="mdi-arrow-right"
                >
                  <span>LOGIN</span>
                </v-btn>

                <!-- Error Alert -->
                <v-expand-transition>
                  <v-alert
                    v-if="error && currentTab === 'login'"
                    type="error"
                    closable
                    class="mt-4"
                    icon="mdi-alert-circle"
                  >
                    {{ error }}
                  </v-alert>
                </v-expand-transition>
              </v-form>
            </v-window-item>

            <!-- REGISTER TAB -->
            <v-window-item value="register">
              <v-form @submit.prevent="handleRegister" class="auth-form">
                <!-- Username Field -->
                <v-text-field
                  v-model="registerForm.username"
                  variant="outlined"
                  density="compact"
                  :disabled="isLoading"
                  :error="!!registerErrors.username"
                  :error-messages="registerErrors.username"
                  @input="registerErrors.username = ''; debouncedCheckUsername()"
                  placeholder="USERNAME"
                />

                <!-- Username availability indicator -->
                <v-expand-transition>
                  <div v-if="registerForm.username.length >= 3" class="mb-2">
                    <v-chip v-if="isCheckingUsername" size="small" class="mr-2">
                      <v-progress-circular size="16" width="2" indeterminate class="mr-2"></v-progress-circular>
                      Checking...
                    </v-chip>
                    <v-chip 
                      v-else-if="usernameAvailable" 
                      size="small" 
                      color="success" 
                      text-color="white"
                      prepend-icon="mdi-check-circle"
                    >
                      Available
                    </v-chip>
                    <v-chip 
                      v-else 
                      size="small" 
                      color="error" 
                      text-color="white"
                      prepend-icon="mdi-close-circle"
                    >
                      Taken
                    </v-chip>
                  </div>
                </v-expand-transition>

                <!-- Password Field -->
                <v-text-field
                  v-model="registerForm.password"
                  type="password"
                  variant="outlined"
                  density="compact"
                  :disabled="isLoading"
                  :error="!!registerErrors.password"
                  :error-messages="registerErrors.password"
                  @input="registerErrors.password = ''"
                  placeholder="PASSWORD"
                />

                <!-- Confirm Password Field -->
                <v-text-field
                  v-model="registerForm.confirmPassword"
                  type="password"
                  variant="outlined"
                  density="compact"
                  :disabled="isLoading"
                  :error="!!registerErrors.confirmPassword"
                  :error-messages="registerErrors.confirmPassword"
                  @input="registerErrors.confirmPassword = ''"
                  @keyup.enter="handleRegister"
                  placeholder="CONFIRM PASSWORD"
                />

                <!-- Animal Preview Card -->
                <v-expand-transition>
                  <v-card 
                    v-if="randomAnimal && registerForm.username.length >= 3" 
                    class="mb-3 animal-preview-card"
                    elevation="1"
                  >
                    <v-card-text class="pa-2 text-center">
                      <div class="d-flex align-center justify-center gap-2">
                        <span class="text-h5">{{ randomAnimal }}</span>
                        <div class="text-left">
                          <div class="font-weight-bold text-body2">{{ registerForm.username }}</div>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-expand-transition>

                <!-- Register Button -->
                <v-btn
                  type="submit"
                  block
                  size="large"
                  :loading="isLoading"
                  :disabled="!usernameAvailable || isCheckingUsername"
                  class="login-btn"
                  append-icon="mdi-account-plus"
                >
                  <span>CREATE ACCOUNT</span>
                </v-btn>

                <!-- Error Alert -->
                <v-expand-transition>
                  <v-alert
                    v-if="error && currentTab === 'register'"
                    type="error"
                    closable
                    class="mt-4"
                    icon="mdi-alert-circle"
                  >
                    {{ error }}
                  </v-alert>
                </v-expand-transition>
              </v-form>
            </v-window-item>
          </v-window>
        </div>
      </div>
    </v-container>

    <!-- Toast Notification -->
    <v-snackbar
      v-model="toastShow"
      :color="toastColor"
      timeout="3000"
      location="top"
      variant="tonal"
    >
      {{ toastMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { loginUser, registerUser, getUserByUsername, getMessages, hideMessage, cleanMessages, cleanUsers } from '@/services/firebase'
import { cleanAllStorage as cleanSupabaseStorage } from '@/services/supabase'
import { clearAllStorage, saveAppVersion } from '@/services/storageCleanup'
import { attemptMigrationFromLocalStorage } from '@/services/session'
import { getRandomAnimal } from '@/utils/animals'

const router = useRouter()
const authStore = useAuthStore()

// Tab control
const currentTab = ref<'login' | 'register'>('login')

// Login form state
const loginForm = ref({
  username: '',
  password: '',
})

const loginErrors = ref({
  username: '',
  password: '',
})

// Register form state
const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
})

const registerErrors = ref({
  username: '',
  password: '',
  confirmPassword: '',
})

// Shared state
const isLoading = ref(false)
const error = ref<string | null>(null)
const isCheckingUsername = ref(false)
const usernameAvailable = ref(false)
const randomAnimal = ref<string | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Toast notification state
const toastShow = ref(false)
const toastMessage = ref('')
const toastColor = ref('success')

function showToast(message: string, color: string = 'success') {
  toastMessage.value = message
  toastColor.value = color
  toastShow.value = true
}

// Watch register username for availability check
watch(
  () => registerForm.value.username,
  (newUsername) => {
    if (newUsername.length >= 3) {
      debouncedCheckUsername()
    } else {
      usernameAvailable.value = false
      randomAnimal.value = null
    }
  }
)

// Debounced username availability check
function debouncedCheckUsername() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  isCheckingUsername.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const user = await getUserByUsername(registerForm.value.username.trim())
      usernameAvailable.value = !user // Available if user doesn't exist
      
      if (usernameAvailable.value && registerForm.value.username.length >= 3) {
        randomAnimal.value = getRandomAnimal()
      } else {
        randomAnimal.value = null
      }
    } catch (err) {
      console.error('Error checking username:', err)
      usernameAvailable.value = false
      randomAnimal.value = null
    } finally {
      isCheckingUsername.value = false
    }
  }, 500)
}

// Clear Messages Handler
async function handleClearMessages() {
  try {
    const confirmed = window.confirm('Are you sure you want to delete all messages?')
    if (!confirmed) return
    
    await cleanMessages()
    showToast('✅ Messages cleared successfully!', 'success')
  } catch (err: any) {
    console.error('Full cleanup error object:', err)
    const errObj = err?.response || err
    const message = errObj?.message || errObj?.error_description || err?.toString() || 'Unknown error'
    showToast(`❌ Error clearing messages: ${message}`, 'error')
  }
}

// Clear Users & Messages Handler
async function handleClearUsers() {
  try {
    const confirmed = window.confirm('Are you sure you want to delete all users and messages?')
    if (!confirmed) return
    
    await cleanUsers()
    await cleanMessages()
    showToast('✅ Users and messages cleared successfully!', 'success')
  } catch (err: any) {
    console.error('Full cleanup error object:', err)
    const errObj = err?.response || err
    const message = errObj?.message || errObj?.error_description || err?.toString() || 'Unknown error'
    showToast(`❌ Error clearing users and messages: ${message}`, 'error')
  }
}

// Clear All Handler (Messages, Users, and Supabase Storage)
async function handleClearAll() {
  try {
    const confirmed = window.confirm('Are you sure you want to delete ALL data? This cannot be undone!')
    if (!confirmed) return
    
    await cleanMessages()
    await cleanUsers()
    await cleanSupabaseStorage()
    showToast('✅ All data cleared successfully!', 'success')
  } catch (err: any) {
    console.error('Full cleanup error object:', err)
    const errObj = err?.response || err
    const message = errObj?.message || errObj?.error_description || err?.toString() || 'Unknown error'
    showToast(`❌ Error clearing all data: ${message}`, 'error')
  }
}

// Clear Supabase & Hide Messages with Files Handler
async function handleClearSupabaseAndHideMessages() {
  try {
    const confirmed = window.confirm('Clear Supabase data and hide all messages with files? This cannot be undone!')
    if (!confirmed) return
    
    console.log('🧹 Starting Supabase cleanup and hiding file messages...')
    
    // 1. Clear all Supabase storage
    console.log('📦 Clearing Supabase storage...')
    await cleanSupabaseStorage()
    console.log('✅ Supabase storage cleared')
    
    // 2. Get all messages
    console.log('📋 Fetching all messages...')
    const allMessages = await getMessages()
    console.log(`Found ${allMessages.length} messages`)
    
    // 3. Hide all messages that have files (imageUrl or fileUrl)
    let hiddenCount = 0
    for (const message of allMessages) {
      if (!message.hidden && (message.imageUrl || message.fileUrl)) {
        try {
          console.log(`📛 Hiding message ${message.id} (has file: ${message.imageUrl ? 'image' : 'file'})`)
          await hideMessage(message.id)
          hiddenCount++
        } catch (error) {
          console.error(`Error hiding message ${message.id}:`, error)
        }
      }
    }
    
    console.log(`✅ Hidden ${hiddenCount} messages with files`)
    showToast(`✅ Done! Supabase cleared & ${hiddenCount} file messages delete`, 'success')
  } catch (err: any) {
    console.error('Full cleanup error object:', err)
    const errObj = err?.response || err
    const message = errObj?.message || errObj?.error_description || err?.toString() || 'Unknown error'
    showToast(`❌ Error: ${message}`, 'error')
  }
}

// LOGIN handler
async function handleLogin() {
  error.value = null
  loginErrors.value = { username: '', password: '' }

  // Validation
  if (!loginForm.value.username.trim()) {
    loginErrors.value.username = 'Username is required'
    return
  }

  if (!loginForm.value.password) {
    loginErrors.value.password = 'Password is required'
    return
  }

  isLoading.value = true

  try {
    // 🧹 Clear all storage FIRST (removes old data from previous app versions)
    console.log('[Login] Clearing all storage before login...')
    clearAllStorage()
    
    // 💾 Attempt migration from old localStorage (if exists) to preserve old session
    console.log('[Login] Attempting migration from old localStorage...')
    const migrationSuccess = attemptMigrationFromLocalStorage()
    if (migrationSuccess) {
      console.log('[Login] ✅ Old session migrated')
    }
    
    // 💾 Save app version (preserved across logout/expiration)
    console.log('[Login] Saving app version...')
    saveAppVersion()

    // ✅ Then verify user credentials
    console.log('[Login] Verifying user credentials...')
    const user = await loginUser(loginForm.value.username, loginForm.value.password)
    
    // Set user and save session
    authStore.setUser(user)
    console.log(`✅ Login successful: ${user.username}`)

    // Redirect to chat
    router.push('/chat')
  } catch (err: any) {
    const errorMessage = err?.message || 'Login failed'
    error.value = errorMessage
    console.error('Login error:', err)
  } finally {
    isLoading.value = false
  }
}

// REGISTER handler
async function handleRegister() {
  error.value = null
  registerErrors.value = { username: '', password: '', confirmPassword: '' }

  // Validation
  if (!registerForm.value.username.trim()) {
    registerErrors.value.username = 'Username is required'
    return
  }

  if (registerForm.value.username.trim().length < 3) {
    registerErrors.value.username = 'Username must be at least 3 characters'
    return
  }

  if (!usernameAvailable.value) {
    registerErrors.value.username = 'Username is already taken'
    return
  }

  if (!registerForm.value.password) {
    registerErrors.value.password = 'Password is required'
    return
  }

  if (registerForm.value.password.length < 3) {
    registerErrors.value.password = 'Password must be at least 3 characters'
    return
  }

  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    registerErrors.value.confirmPassword = 'Passwords do not match'
    return
  }

  isLoading.value = true

  try {
    // 🧹 Clear all storage FIRST (removes old data from previous app versions)
    console.log('[Register] Clearing all storage before registration...')
    clearAllStorage()
    
    // 💾 Attempt migration from old localStorage (if exists) to preserve old session
    console.log('[Register] Attempting migration from old localStorage...')
    const migrationSuccess = attemptMigrationFromLocalStorage()
    if (migrationSuccess) {
      console.log('[Register] ✅ Old session migrated')
    }
    
    // 💾 Save app version (preserved across logout/expiration)
    console.log('[Register] Saving app version...')
    saveAppVersion()

    const user = await registerUser(
      registerForm.value.username,
      registerForm.value.password,
      randomAnimal.value || undefined
    )

    console.log(`✨ Account created: ${user.username}`)

    // Set user and save session
    authStore.setUser(user)

    // Redirect to chat
    router.push('/chat')
  } catch (err: any) {
    const errorMessage = err?.message || 'Registration failed'
    error.value = errorMessage
    console.error('Registration error:', err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* Container */
.create-account-container {
  width: 100%;
  min-height: 100vh;
  background: var(--clr-surface-a0);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;
}

:global(html.dark) .create-account-container {
  background: var(--clr-surface-a0) !important;
}

.auth-container {
  position: relative;
  z-index: 1;
}

/* Auth Card */
.auth-card {
  width: 100%;
  max-width: 380px;
  background: var(--clr-surface-a0);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  animation: slideInUp 0.6s ease-out;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

:global(html.dark) .auth-card {
  background: var(--clr-surface-a10);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Avatar Section */
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

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
  }
  70% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

/* NO WA Container with Hidden Buttons */
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
  transition: all 0.3s ease;
  position: relative;
}

.no-wa-char {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
  min-width: 32px;
  text-align: center;
  line-height: 1;
}

.no-wa-n,
.no-wa-w,
.no-wa-a,
.no-wa-c {
  cursor: pointer;
  opacity: 1;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.no-wa-n:hover,
.no-wa-w:hover,
.no-wa-a:hover,
.no-wa-c:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.25);
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.no-wa-n:active,
.no-wa-w:active,
.no-wa-a:active,
.no-wa-c:active {
  transform: scale(0.95);
}

/* Hidden C Button - Shows on container hover */
.no-wa-c {
  opacity: 0;
  width: 0;
  overflow: hidden;
  padding: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.no-wa-container:hover .no-wa-c {
  opacity: 1;
  width: 32px;
  padding: 6px 10px;
}

.no-wa-c:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.25);
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Zoom animation on hover */
@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.no-wa-container:hover {
  animation: zoomIn 0.3s ease-out;
}

/* Tabs */
.auth-tabs {
  background: var(--clr-surface-a10);
  transition: background 0.3s ease;
}

:global(html.dark) .auth-tabs {
  background: var(--clr-surface-a20);
}

:deep(.auth-tabs .v-tab) {
  flex: 1 1 !important;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  padding: 12px 8px !important;
}

:deep(.auth-tabs .v-tab.v-tab--selected) {
  color: var(--clr-primary-a0) !important;
}

:deep(.auth-tabs .v-tab-item) {
  padding: 0;
}

/* Auth Content */
.auth-content {
  padding: 24px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Text Fields */
:deep(.auth-form .v-text-field) {
  margin-bottom: 0;
}

:deep(.auth-form .v-text-field .v-field__input) {
  padding: 8px 12px;
  font-size: 0.95rem;
}

:deep(.auth-form .v-field) {
  min-height: 42px;
}

/* Login Button */
.login-btn {
  background: linear-gradient(135deg, var(--clr-primary-a0) 0%, var(--clr-primary-a30) 100%) !important;
  color: white !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px;
  height: 48px !important;
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  margin-top: 8px;
  margin-bottom: 12px;
  border: none !important;
  box-shadow: 0 4px 12px rgba(225, 18, 162, 0.25) !important;
}

.login-btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 24px rgba(225, 18, 162, 0.35) !important;
  background: linear-gradient(135deg, var(--clr-primary-a10) 0%, var(--clr-primary-a20) 100%) !important;
}

.login-btn:active {
  transform: translateY(-1px) scale(0.98);
  box-shadow: 0 6px 16px rgba(225, 18, 162, 0.3) !important;
}

:deep(.login-btn .v-btn__content) {
  color: white !important;
}

:deep(.login-btn:hover .v-btn__overlay) {
  opacity: 0 !important;
}

/* Animal Preview Card */
.animal-preview-card {
  background: var(--clr-surface-tonal-a0) !important;
  border: 2px solid var(--clr-primary-a20) !important;
  border-radius: 12px !important;
  animation: slideInUp 0.4s ease-out;
  transition: background 0.3s ease, border-color 0.3s ease;
}

:global(html.dark) .animal-preview-card {
  background: var(--clr-surface-tonal-a10) !important;
  border: 2px solid var(--clr-primary-a20) !important;
}

/* Error alert */
:deep(.auth-content .v-alert) {
  border-radius: 8px !important;
  animation: slideDown 0.4s ease-out;
  margin-top: 12px !important;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive design */
@media (max-width: 480px) {
  .auth-card {
    max-width: 90%;
    margin: 16px;
  }

  .avatar-section {
    padding: 24px;
  }

  .avatar-circle {
    width: 80px;
    height: 80px;
  }

  .auth-content {
    padding: 16px;
  }
}
</style>
