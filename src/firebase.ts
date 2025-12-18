/**
 * Firebase Cloud Messaging (FCM) Setup for Web Push Notifications
 * Handles notification permissions and FCM token management
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: any = null;
let messaging: any = null;

export const initializeFirebase = () => {
  try {
    if (!app) {
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase initialized successfully');
    }
    return app;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return null;
  }
};

// Get Firebase messaging instance
export const getFirebaseMessaging = () => {
  if (!app) {
    initializeFirebase();
  }
  if (!messaging && app) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('❌ Error getting messaging instance:', error);
    }
  }
  return messaging;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('⚠️ This browser does not support notifications');
      return null;
    }

    // Check if already granted
    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return await getFCMToken();
    }

    // Request permission
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return await getFCMToken();
      } else {
        console.log('⚠️ Notification permission denied');
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return null;
  }
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      console.error('❌ Messaging instance not available');
      return null;
    }

    // Register Firebase messaging service worker
    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('✅ Firebase messaging service worker registered');
    } catch (error) {
      console.log('ℹ️ Using existing service worker registration');
      registration = await navigator.serviceWorker.ready;
    }
    
    const token = await getToken(messagingInstance, {
      serviceWorkerRegistration: registration,
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log('✅ FCM Token obtained:', token);
      return token;
    } else {
      console.log('⚠️ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

// Handle foreground notifications (when app is open)
export const handleForegroundNotifications = (
  callback?: (payload: any) => void
) => {
  try {
    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      console.error('❌ Messaging instance not available');
      return;
    }

    onMessage(messagingInstance, (payload) => {
      console.log('📬 Foreground notification received:', payload);

      const notificationTitle = payload.notification?.title || 'DukaBook';
      const notificationOptions = {
        body: payload.notification?.body || 'New notification',
        icon: payload.notification?.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: payload.data?.type || 'notification',
        data: payload.data,
      };

      // Show notification even when app is in foreground
      if (Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
      }

      // Call custom callback if provided
      if (callback) {
        callback(payload);
      }
    });
  } catch (error) {
    console.error('❌ Error handling foreground notifications:', error);
  }
};

// Save FCM token to database (you'll implement this)
export const saveFCMTokenToDatabase = async (
  token: string,
  storeId: string
): Promise<boolean> => {
  try {
    // This will be called from your backend
    const response = await fetch('/api/save-fcm-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, storeId, timestamp: new Date().toISOString() }),
    });

    if (response.ok) {
      console.log('✅ FCM token saved to database');
      return true;
    } else {
      console.error('❌ Failed to save FCM token');
      return false;
    }
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    return false;
  }
};

// Check notification support
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Check if notifications are enabled
export const areNotificationsEnabled = (): boolean => {
  return isNotificationSupported() && Notification.permission === 'granted';
};
