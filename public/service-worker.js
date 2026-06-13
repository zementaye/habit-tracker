// Service Worker for push notifications
// Place this file in public/service-worker.js

self.addEventListener('push', function(event) {
  const data = event.data?.json() || {
    title: '⏰ Routine reminder',
    body: 'Time to check your routine',
    icon: '/icon.png'
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'routine-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open app',
        icon: '/check-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/close-icon.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  
  if (event.action === 'dismiss') return

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/today-routine')
      }
    })
  )
})