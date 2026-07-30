/**
 * Service Worker for Chit-Chat Application
 * Handles notification persistence and background notification delivery
 */

// Message listener from pages/clients - display notifications
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  if (type === 'SHOW_NOTIFICATION') {
    console.log('[SW] Received notification message:', data)
    
    // Display notification using Service Worker
    // This works reliably even when page is in background tab
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/vite.svg',
      badge: data.badge,
      tag: data.tag || 'chit-chat-notification',
      requireInteraction: data.requireInteraction ?? true,
      data: {
        messageId: data.messageId,
        userId: data.userId,
      },
    }).catch((err) => {
      console.error('[SW] Error showing notification:', err)
    })
  }
})

// Notification event listener
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event)
  
  // For now, we're not using Push API backend
  // But service worker is ready for future Push API integration
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  
  // Close the notification
  event.notification.close()
  
  // Focus or open the application window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app window is already open
      for (let client of clientList) {
        if (client.url === '/' || client.url.includes('/chat')) {
          // Focus existing window
          return client.focus()
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag)
})

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing')
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating')
  // Claim all clients immediately
  event.waitUntil(clients.claim())
})

// Message handler (for communication with app)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'PING') {
    console.log('[SW] Responding to PING')
    event.ports[0].postMessage({ type: 'PONG' })
  }
})
