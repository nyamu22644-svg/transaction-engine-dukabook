/**
 * Firebase Cloud Messaging Service Worker
 * Handles background notifications when app is closed
 */

// Import Firebase messaging scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js');

// Initialize Firebase with CDN
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  console.log('🔔 Firebase Messaging Service Worker initialized');
} catch (error) {
  console.error('❌ Firebase initialization error in SW:', error);
}

// Handle background messages when app is closed
self.addEventListener('push', (event) => {
  console.log('📬 Background push notification received:', event.data);

  // Parse the FCM message
  const data = event.data?.json() || {};
  
  const notificationTitle = data.notification?.title || 'DukaBook Notification';
  const notificationOptions = {
    body: data.notification?.body || 'You have a new message',
    icon: data.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.data?.type || 'notification',
    requireInteraction: true, // Keep notification until user interacts
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification.tag);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const clientUrl = notificationData.link || '/';

  // Handle action button clicks
  if (event.action === 'close') {
    return;
  }

  // Open the app or bring it to focus
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === clientUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if app is not running
      if (clients.openWindow) {
        return clients.openWindow(clientUrl);
      }
    })
  );
});

// Handle notification dismissal
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification dismissed:', event.notification.tag);
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('💬 Message received in SW:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
