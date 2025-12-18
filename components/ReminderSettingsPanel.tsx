/**
 * Reminder Settings Panel Component
 * Allows SuperAdmin to configure cron schedules and thresholds
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Clock, Calendar } from 'lucide-react';
import { getReminderSettings, updateReminderSettings, ReminderSettings } from '../services/reminderSettingsService';

interface ReminderSettingsPanelProps {
  onClose: () => void;
}

export const ReminderSettingsPanel: React.FC<ReminderSettingsPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    cron_hour: 8,
    afternoon_cron_hour: 15,
    trial_days_before: 3,
    payment_days_before_7: 7,
    payment_days_before_3: 3,
    enable_trial_reminders: true,
    enable_payment_reminders: true,
    enable_overdue_reminders: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getReminderSettings();
      if (data) {
        setSettings(data);
        setFormData({
          cron_hour: data.cron_hour,
          afternoon_cron_hour: data.afternoon_cron_hour || 15,
          trial_days_before: data.trial_days_before,
          payment_days_before_7: data.payment_days_before_7,
          payment_days_before_3: data.payment_days_before_3,
          enable_trial_reminders: data.enable_trial_reminders,
          enable_payment_reminders: data.enable_payment_reminders,
          enable_overdue_reminders: data.enable_overdue_reminders,
        });
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateReminderSettings(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-2xl p-8 text-center">
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Reminder Settings</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm">✅ Settings saved successfully!</p>
            </div>
          )}

          {/* Schedule Section */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Reminder Schedule</h3>
            </div>

            <div className="space-y-6">
              {/* Morning Reminder */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  ☀️ Morning Reminder (Kenya Time)
                </label>
                <div className="flex items-center gap-4 bg-slate-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={formData.cron_hour}
                      onChange={(e) => {
                        const hour = parseInt(e.target.value);
                        setFormData({ ...formData, cron_hour: hour });
                      }}
                      className="w-16 px-3 py-2 bg-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-center"
                    />
                    <span className="text-slate-300">:00</span>
                  </div>
                  <div className="text-sm">
                    <p className="text-blue-300 font-semibold">
                      {formData.cron_hour}:00 UTC = {String((formData.cron_hour + 3) % 24).padStart(2, '0')}:00 EAT
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Kenya Time (UTC+3)</p>
                  </div>
                </div>
              </div>

              {/* Afternoon Reminder */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  🌅 Afternoon Reminder (Kenya Time)
                </label>
                <div className="flex items-center gap-4 bg-slate-700/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={formData.afternoon_cron_hour}
                      onChange={(e) => {
                        const hour = parseInt(e.target.value);
                        setFormData({ ...formData, afternoon_cron_hour: hour });
                      }}
                      className="w-16 px-3 py-2 bg-slate-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 font-mono text-center"
                    />
                    <span className="text-slate-300">:00</span>
                  </div>
                  <div className="text-sm">
                    <p className="text-amber-300 font-semibold">
                      {formData.afternoon_cron_hour}:00 UTC = {String((formData.afternoon_cron_hour + 3) % 24).padStart(2, '0')}:00 EAT
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Kenya Time (UTC+3)</p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-700/30 p-3 rounded border border-slate-600">
                💡 <span className="text-slate-300 font-semibold">How it works:</span> Reminders send twice daily - morning and afternoon. Stores get the same reminder types at both times if conditions are met.
              </div>
            </div>
          </div>

          {/* Trial Reminders */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-bold text-white">Trial Reminders</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable_trial_reminders}
                    onChange={(e) =>
                      setFormData({ ...formData, enable_trial_reminders: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-slate-300">Enable trial ending reminders</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Send trial reminders {formData.trial_days_before} days before expiry:
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.trial_days_before}
                  onChange={(e) =>
                    setFormData({ ...formData, trial_days_before: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Reminders */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Payment Reminders</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable_payment_reminders}
                    onChange={(e) =>
                      setFormData({ ...formData, enable_payment_reminders: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-slate-300">Enable payment reminders</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    First reminder (days before):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.payment_days_before_7}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_days_before_7: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Second reminder (days before):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={formData.payment_days_before_3}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_days_before_3: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Reminders */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-bold text-white">Overdue Reminders</h3>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enable_overdue_reminders}
                  onChange={(e) =>
                    setFormData({ ...formData, enable_overdue_reminders: e.target.checked })
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-slate-300">Send reminders for overdue payments</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
