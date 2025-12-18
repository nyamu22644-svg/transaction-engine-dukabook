/**
 * Reminder Settings Service
 * Manages cron schedules and reminder thresholds
 */

import { supabase } from './supabaseClient';

export interface ReminderSettings {
  id: string;
  cron_hour: number;
  afternoon_cron_hour: number;
  trial_days_before: number;
  payment_days_before_7: number;
  payment_days_before_3: number;
  enable_trial_reminders: boolean;
  enable_payment_reminders: boolean;
  enable_overdue_reminders: boolean;
  updated_at: string;
  updated_by?: string;
}

export const getReminderSettings = async (): Promise<ReminderSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching reminder settings:', error);
      return null;
    }

    return data as ReminderSettings;
  } catch (err) {
    console.error('Error in getReminderSettings:', err);
    return null;
  }
};

export const updateReminderSettings = async (
  updates: Partial<ReminderSettings>,
  updatedBy?: string
): Promise<ReminderSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('reminder_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .single()
      .select();

    if (error) {
      console.error('Error updating reminder settings:', error);
      return null;
    }

    console.log('✅ Reminder settings updated');
    return data as ReminderSettings;
  } catch (err) {
    console.error('Error in updateReminderSettings:', err);
    return null;
  }
};

export const getDefaultSettings = (): ReminderSettings => {
  return {
    id: 'default',
    cron_hour: 8,
    afternoon_cron_hour: 15,
    trial_days_before: 3,
    payment_days_before_7: 7,
    payment_days_before_3: 3,
    enable_trial_reminders: true,
    enable_payment_reminders: true,
    enable_overdue_reminders: true,
    updated_at: new Date().toISOString(),
  };
};
