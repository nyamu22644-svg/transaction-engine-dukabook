import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Debug: Check if credentials are loaded
console.log('📧 Gmail User:', process.env.GMAIL_USER ? '✓ Set' : '✗ Not set');
console.log('📧 Gmail Pass:', process.env.GMAIL_PASSWORD ? '✓ Set' : '✗ Not set');

const app = express();
const API_PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Test Gmail connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail SMTP connection failed:', error.message);
    console.log('⚠️  Email sending will not work without valid Gmail credentials');
  } else {
    console.log('✅ Gmail SMTP authenticated successfully');
    console.log(`   User: ${process.env.GMAIL_USER}`);
  }
});

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, message, reminderType } = req.body;

    // Validate
    if (!to || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, message',
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        error: `Invalid email address: ${to}` 
      });
    }

    // Create HTML email
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
    .footer { color: #999; text-align: center; font-size: 12px; }
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

    console.log(`📧 Sending email to: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Type: ${reminderType || 'MANUAL'}`);

    // Send email
    const info = await transporter.sendMail({
      from: `DukaBook <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: message,
      replyTo: 'support@dukabook.com',
    });

    console.log(`✅ Email sent successfully!`);
    console.log(`   Message ID: ${info.messageId}`);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      to: to,
      subject: subject,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return res.status(500).json({
      error: 'Failed to send email',
      message: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(API_PORT, () => {
  console.log(`\n🚀 DukaBook API Server running on http://localhost:${API_PORT}`);
  console.log(`📧 Email endpoint: POST http://localhost:${API_PORT}/api/send-email\n`);
});
