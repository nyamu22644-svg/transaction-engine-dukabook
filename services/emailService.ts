import { supabase } from './supabaseClient';

export interface ReminderTemplate {
  id: string;
  reminder_type: string;
  subject: string;
  message: string;
  updated_at: string;
}

export interface ReminderEmailParams {
  storeEmail: string;
  storeName: string;
  daysUntilExpiry: number;
  expiryDate: string;
  reminderType?: string;
  customSubject?: string;
  customMessage?: string;
  accessCode?: string;
  paymentLink?: string;
}

// Fetch template from database
export const getTemplate = async (reminderType: string = 'MANUAL_REMINDER'): Promise<ReminderTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('reminder_templates')
      .select('id, reminder_type, subject, message, updated_at')
      .eq('reminder_type', reminderType)
      .single();

    if (error) {
      console.error('Template fetch error:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
};

// Format message with placeholders
function formatMessage(
  template: string,
  storeName: string,
  daysUntilExpiry: number,
  expiryDate: string,
  accessCode?: string,
  paymentLink?: string
): string {
  let message = template;
  message = message.replace(/{storeName}/g, storeName);
  message = message.replace(/{daysLeft}/g, daysUntilExpiry.toString());
  message = message.replace(/{expiryDate}/g, expiryDate);
  message = message.replace(/{accessCode}/g, accessCode || 'Your Store ID');
  message = message.replace(/{paymentLink}/g, paymentLink || 'https://dukabook.com/renew');
  return message;
}

// Send email via backend API
export const sendReminderEmail = async (params: ReminderEmailParams): Promise<boolean> => {
  try {
    const {
      storeEmail,
      storeName,
      daysUntilExpiry,
      expiryDate,
      reminderType = 'MANUAL_REMINDER',
      customSubject,
      customMessage,
      accessCode,
      paymentLink,
    } = params;

    let subject = customSubject;
    let messageContent = customMessage;

    // If custom message not provided, fetch from database
    if (!customSubject || !customMessage) {
      const template = await getTemplate(reminderType);
      subject = customSubject || template?.subject || '📢 DukaBook Subscription Reminder';
      messageContent = customMessage || template?.message || '';
    }

    // Format the message with actual values
    const formattedMessage = formatMessage(
      messageContent,
      storeName,
      daysUntilExpiry,
      expiryDate,
      accessCode,
      paymentLink
    );

    console.log('Sending reminder email to:', storeEmail);
    console.log('Subject:', subject);
    console.log('Days until expiry:', daysUntilExpiry);

    // Call backend API to send email
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: storeEmail,
        subject: subject,
        message: formattedMessage,
        reminderType,
        storeName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Email API error:', data.error || data.details);
      return false;
    }

    console.log('Email sent successfully:', data.messageId);
    return true;
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return false;
  }
};
