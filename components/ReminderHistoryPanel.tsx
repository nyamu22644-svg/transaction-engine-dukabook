import React, { useEffect, useState } from 'react';
import { X, RotateCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ReminderLog {
  id: string;
  store_id: string;
  reminder_type: string;
  sent_at: string;
  status: string;
  error_message?: string;
}

export const ReminderHistoryPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [reminders, setReminders] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminderHistory();
  }, []);

  const loadReminderHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setReminders(data as ReminderLog[]);
      }
    } catch (err) {
      console.error('Error loading reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-400';
      case 'FAILED':
        return 'text-red-400';
      case 'PENDING':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <RotateCw className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Reminder History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <RotateCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-400">Loading reminder history...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No reminders sent yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Store ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Sent At</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-300">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map(reminder => (
                    <tr key={reminder.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-300">
                        {reminder.store_id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-slate-700 text-slate-200 px-2 py-1 rounded">
                          {reminder.reminder_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(reminder.sent_at).toLocaleString('en-KE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(reminder.status)}
                          <span className={`text-xs font-semibold ${getStatusColor(reminder.status)}`}>
                            {reminder.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {reminder.error_message ? (
                          <span className="text-red-400">{reminder.error_message}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-800 border-t border-slate-700 p-4 flex justify-between items-center">
          <p className="text-xs text-slate-400">
            Showing last 50 reminders • Total: {reminders.length}
          </p>
          <button
            onClick={loadReminderHistory}
            className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition"
          >
            <RotateCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
