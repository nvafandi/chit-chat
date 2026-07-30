/**
 * Service Worker Registration Utility
 * Registers and manages the service worker for background notifications
 */

/**
 * Register service worker for background notification support
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker API not supported in this browser')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      {
        scope: '/',
      }
    )

    console.log('[SW] Service Worker registered successfully:', registration)

    // Check for updates periodically
    setInterval(async () => {
      try {
        await registration.update()
      } catch (err) {
        console.error('[SW] Error checking for updates:', err)
      }
    }, 60 * 60 * 1000) // Check every hour

    return registration
  } catch (error) {
    console.error('[SW] Error registering Service Worker:', error)
    return null
  }
}

/**
 * Send message to service worker (for testing/debugging)
 */
export async function pingServiceWorker(): Promise<boolean> {
  if (!navigator.serviceWorker.controller) {
    console.warn('[SW] Service Worker not controlling this page')
    return false
  }

  try {
    const channel = new MessageChannel()

    const promise = new Promise<boolean>((resolve) => {
      channel.port1.onmessage = (event) => {
        if (event.data && event.data.type === 'PONG') {
          console.log('[SW] Received PONG response')
          resolve(true)
        }
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        resolve(false)
      }, 5000)
    })

    navigator.serviceWorker.controller.postMessage(
      { type: 'PING' },
      [channel.port2]
    )

    return promise
  } catch (error) {
    console.error('[SW] Error pinging service worker:', error)
    return false
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      await registration.unregister()
    }
    console.log('[SW] Service Worker unregistered')
    return true
  } catch (error) {
    console.error('[SW] Error unregistering Service Worker:', error)
    return false
  }
}

export default {
  registerServiceWorker,
  pingServiceWorker,
  unregisterServiceWorker,
}
