// Service Worker для Web Push уведомлений
// Этот файл должен быть в папке public для доступности по URL

// Обработка push-событий (когда приходит уведомление с сервера)
self.addEventListener('push', (event) => {
  console.log('📬 [SW] Push event received:', event);
  
  let notificationData = {
    title: 'Новое уведомление',
    body: 'У вас новое уведомление',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'notification',
    data: {},
    requireInteraction: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  // Пытаемся распарсить данные из push события
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.notification?.title || data.title || notificationData.title,
        body: data.notification?.body || data.body || notificationData.body,
        icon: data.notification?.icon || data.icon || notificationData.icon,
        badge: data.notification?.badge || '/icon-192x192.png',
        tag: data.data?.type || data.tag || 'notification',
        data: data.data || {},
        requireInteraction: data.requireInteraction || false,
        vibrate: data.vibrate || [200, 100, 200],
        timestamp: Date.now()
      };
    } catch (e) {
      // Если не JSON, пытаемся как текст
      try {
        const text = event.data.text();
        if (text) {
          notificationData.body = text;
        }
      } catch (e2) {
        console.error('❌ [SW] Error parsing push data:', e2);
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Если окно уже открыто, фокусируемся на нем
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Иначе открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Обработка закрытия уведомления
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 [SW] Notification closed:', event.notification);
});

