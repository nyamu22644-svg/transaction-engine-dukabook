import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Create transporter with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || process.env.VITE_GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD || process.env.VITE_GMAIL_PASSWORD,
  },
});

// Test the connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail connection failed:', error.message);
  } else {
    console.log('✅ Gmail SMTP ready - authenticated as:', process.env.GMAIL_USER);
  }
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, message, reminderType } = req.body;

    // Validate
    if (!to || !subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { to, subject, message: message ? 'provided' : 'missing' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: `Invalid email address: ${to}` });
    }

    // HTML version of message
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; max-width: 600px; margin: 0 auto; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1F2937; margin: 0 0 30px 0; text-align: center; font-size: 28px; }
    .content { color: #555; line-height: 1.8; font-size: 16px; }
    .content p { margin: 12px 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 30px 0; }
    .footer { color: #999; text-align: center; margin: 0; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>DukaBook</h1>
    <div class="content">
      ${message.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>
    <hr>
    <p class="footer">DukaBook &copy; 2024. All rights reserved.<br>For support: support@dukabook.com</p>
  </div>
</body>
</html>
    `;

    // Send email
    console.log(`📧 Sending email to: ${to}`);
    const info = await transporter.sendMail({
      from: `DukaBook <${process.env.GMAIL_USER || process.env.VITE_GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: message,
      replyTo: 'support@dukabook.com',
    });

    console.log(`✅ Email sent successfully!`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Message ID: ${info.messageId}`);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      to: to,
      subject: subject,
    });

  } catch (error) {
    console.error('❌ Email send error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
      details: error.toString(),
    });
  }
}
