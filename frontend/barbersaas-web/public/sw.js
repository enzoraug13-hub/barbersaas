// Trocar o nome invalida o cache antigo no activate (rebrand Trimly).
const CACHE_NAME = 'trimly-v1'
const STATIC_ASSETS = ['/', '/admin', '/login']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API: network first, sem cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ error: 'Sem conexão' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }))
    )
    return
  }

  // Assets estáticos: cache first
  if (event.request.destination === 'script' || event.request.destination === 'style' || event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cached => cached ?? fetch(event.request).then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      }))
    )
    return
  }

  // SPA: network first, fallback para index.html
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match('/') ?? caches.match('/index.html'))
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Trimly', body: 'Você tem uma notificação.' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/admin'
  event.waitUntil(clients.openWindow(url))
})
