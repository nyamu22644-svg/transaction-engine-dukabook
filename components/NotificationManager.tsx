/**
 * Notification Manager Component
 * Handles FCM setup and user notification preferences
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, AlertCircle, Loader } from 'lucide-react';
import {
  initializeFirebase,
  requestNotificationPermission,
  areNotificationsEnabled,
  isNotificationSupported,
  handleForegroundNotifications,
  saveFCMTokenToDatabase,
} from '../src/firebase';
import { useStore } from '../store';

export const NotificationManager: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { activeStore } = useStore();

  // Initialize on component mount
  useEffect(() => {
    const init = async () => {
      try {
        // Check browser support
        if (!isNotificationSupported()) {
          setError('Your browser does not support notifications');
          return;
        }

        // Initialize Firebase
        initializeFirebase();

        // Check if notifications are already enabled
        setNotificationsEnabled(areNotificationsEnabled());

        // If enabled, set up foreground notification handling
        if (areNotificationsEnabled()) {
          handleForegroundNotifications((payload) => {
            console.log('🔔 Notification received in app:', payload);
          });
        }

        // Load saved token from localStorage if exists
        const savedToken = localStorage.getItem('fcm_token');
        if (savedToken) {
          setFcmToken(savedToken);
        }
      } catch (err) {
        console.error('Error initializing notifications:', err);
        setError('Failed to initialize notifications');
      }
    };

    init();
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await requestNotificationPermission();

      if (token) {
        setFcmToken(token);
        setNotificationsEnabled(true);

        // Save token to localStorage
        localStorage.setItem('fcm_token', token);

        // Save to database if user is logged in
        if (activeStore?.id) {
          const saved = await saveFCMTokenToDatabase(token, activeStore.id);
          if (!saved) {
            console.warn('Token saved locally but failed to sync to database');
          }
        }

        // Set up foreground notification handling
        handleForegroundNotifications((payload) => {
          console.log('🔔 Notification received in app:', payload);
        });

        setShowModal(false);
      } else {
        setError('Failed to enable notifications. Please try again.');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError('An error occurred while enabling notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = () => {
    // Remove from localStorage
    localStorage.removeItem('fcm_token');
    setFcmToken(null);
    setNotificationsEnabled(false);
    setError(null);
    console.log('📵 Notifications disabled');
  };

  // Don't render if browser doesn't support notifications
  if (!isNotificationSupported()) {
    return null;
  }

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`relative p-3 rounded-lg transition ${
          notificationsEnabled
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
        }`}
        title={notificationsEnabled ? 'Reminders enabled' : 'Turn on reminders'}
      >
        {notificationsEnabled ? (
          <Bell className="w-5 h-5" />
        ) : (
          <BellOff className="w-5 h-5" />
        )}
        {notificationsEnabled && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}
      </button>

      {/* Notification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Bell className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Enable Reminders</h2>
                <p className="text-sm text-slate-400">
                  Stay updated with payment and subscription reminders
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                {notificationsEnabled ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">
                      Reminders Enabled
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">
                      Reminders Disabled
                    </span>
                  </>
                )}
              </div>
              {fcmToken && (
                <p className="text-xs text-slate-500 break-all">
                  Token: {fcmToken.substring(0, 20)}...
                </p>
              )}
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-6">
              <div className="flex gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Payment due reminders</span>
              </div>
              <div className="flex gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Trial expiry alerts</span>
              </div>
              <div className="flex gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Works even when app is closed</span>
              </div>
              <div className="flex gap-2 text-sm text-slate-300">
                <span className="text-green-400">✓</span>
                <span>100% free - no SMS charges</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {notificationsEnabled ? (
                <>
                  <button
                    onClick={handleDisableNotifications}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium text-sm"
                  >
                    Turn Off
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium text-sm"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleEnableNotifications}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition font-medium text-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Enabling...
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        Turn On Reminders
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium text-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>

            {/* Info */}
            <p className="text-xs text-slate-500 mt-4">
              🔒 Your data is secure. We never share your notification token with third parties.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
