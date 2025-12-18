import React, { useEffect, useState } from 'react';
import { AlertTriangle, Send, CheckCircle, X, Edit2 } from 'lucide-react';
import { getPaymentHistory, getAllSubscriptions, calculateDaysRemaining } from '../services/billingService';
import { sendReminderEmail, getTemplate } from '../services/emailService';
import { StoreSubscription } from '../types';

interface ReminderStore {
  storeId: string;
  storeName: string;
  storeEmail?: string;
  daysUntilExpiry: number;
  expiresAt: string;
  subscription: StoreSubscription;
}

export const ManualReminderPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [reminders, setReminders] = useState<ReminderStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<{ storeId: string; message: string } | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [reminderType, setReminderType] = useState('MANUAL_REMINDER');

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const subs = await getAllSubscriptions();
      
      const expiringStores: ReminderStore[] = subs
        .filter(sub => {
          const daysLeft = calculateDaysRemaining(sub.expires_at);
          return daysLeft >= 0 && daysLeft <= 14; // Show stores expiring within 14 days
        })
        .map(sub => {
          const daysLeft = calculateDaysRemaining(sub.expires_at);
          const storeEmail = sub.store?.email || `${sub.store_id}@dukabook.local`;
          return {
            storeId: sub.store_id,
            storeName: sub.store?.name || sub.store_id,
            storeEmail: storeEmail,
            daysUntilExpiry: daysLeft,
            expiresAt: sub.expires_at,
            subscription: sub,
          };
        });

      setReminders(expiringStores);
    } catch (err) {
      console.error('Error loading reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = async (storeId: string, type: string = 'MANUAL_REMINDER') => {
    setEditingStoreId(storeId);
    setReminderType(type);
    
    // Load template from database
    const template = await getTemplate(type);
    if (template) {
      setCustomSubject(template.subject);
      setCustomMessage(template.message);
    }
  };

  const sendReminder = async (reminder: ReminderStore) => {
    setSending(reminder.storeId);
    try {
      const formattedDate = new Date(reminder.expiresAt).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const freshDays = getFreshDays(reminder.expiresAt);

      // Send email with custom or default message
      const result = await sendReminderEmail({
        storeEmail: reminder.storeEmail || `${reminder.storeId}@store.dukabook.com`,
        storeName: reminder.storeName,
        daysUntilExpiry: freshDays,
        expiryDate: formattedDate,
        reminderType,
        customSubject: customSubject || undefined,
        customMessage: customMessage || undefined,
        accessCode: reminder.storeId,
        paymentLink: `https://dukabook.com/renew?storeId=${reminder.storeId}`,
      });

      if (result) {
        setSentMessage({
          storeId: reminder.storeId,
          message: '✅ Email sent successfully',
        });
      } else {
        setSentMessage({
          storeId: reminder.storeId,
          message: '❌ Failed to send email',
        });
      }

      setEditingStoreId(null);
      setTimeout(() => setSentMessage(null), 3000);
      loadReminders();
    } catch (err) {
      console.error('Error sending reminder:', err);
      setSentMessage({
        storeId: reminder.storeId,
        message: '❌ Error sending reminder',
      });
    } finally {
      setSending(null);
    }
  };

  // Recalculate days each render to ensure fresh values
  const getFreshDays = (expiresAt: string): number => {
    return calculateDaysRemaining(expiresAt);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl p-8 text-center">
          <p className="text-white">Loading reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-bold text-white">Manual Reminders</h2>
            <span className="text-sm text-slate-400">({reminders.length} expiring soon)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {reminders.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-400">No stores expiring soon!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map(reminder => (
                <div key={reminder.storeId}>
                  {editingStoreId === reminder.storeId ? (
                    // Edit mode
                    <div className="bg-slate-800 p-6 rounded-lg border border-blue-500">
                      <h3 className="text-white font-bold mb-4">{reminder.storeName}</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Email Subject</label>
                          <input
                            type="text"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Email subject line"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Message</label>
                          <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            rows={8}
                            placeholder="Use {storeName}, {daysLeft}, {expiryDate}, {accessCode}, {paymentLink}"
                          />
                          <p className="text-xs text-slate-500 mt-2">
                            Available placeholders: {'{'} storeName{'}'}, {'{'} daysLeft{'}'}, {'{'} expiryDate{'}'}, {'{'} accessCode{'}'}, {'{'} paymentLink{'}'}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => sendReminder(reminder)}
                            disabled={sending === reminder.storeId}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                          >
                            <Send className="w-4 h-4" />
                            {sending === reminder.storeId ? 'Sending...' : 'Send Email'}
                          </button>
                          <button
                            onClick={() => setEditingStoreId(null)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // List mode
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{reminder.storeName}</p>
                        <p className="text-sm text-amber-400">
                          {getFreshDays(reminder.expiresAt)} days until expiry ({new Date(reminder.expiresAt).toLocaleDateString('en-KE')})
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(reminder.storeId, 'MANUAL_REMINDER')}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Customize
                        </button>
                      </div>
                      {sentMessage?.storeId === reminder.storeId && (
                        <span className="text-xs ml-2 text-green-400">{sentMessage.message}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
