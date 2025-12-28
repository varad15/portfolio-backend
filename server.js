const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// ✅ DUAL BACKUP: Gmail SMTP → EmailJS Fallback
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log('📧 FORM DATA:', { name, email, subject, message: message.substring(0, 100) });

    let emailsSent = 0;

    // 🔄 TRY 1: GMAIL SMTP (Primary)
    try {
      console.log('🔄 TRYING GMAIL SMTP...');
      const smtpTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        pool: true,
        maxConnections: 1,
        connectionTimeout: 15000,
        logger: true,
        debug: true
      });

      await smtpTransporter.verify();

      // EMAIL 1: TO YOU
      await smtpTransporter.sendMail({
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: process.env.RECEIVER_EMAIL,
        replyTo: email,
        subject: `Portfolio: ${subject}`,
        html: `
          <h2>✨ New Message from ${name}</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
        `
      });
      emailsSent++;

      // EMAIL 2: ACK TO USER
      await smtpTransporter.sendMail({
        from: `"Portfolio Bot" <${process.env.EMAIL_USER}>`,
        to: email,
        replyTo: process.env.RECEIVER_EMAIL,
        subject: `✅ Thanks ${name}! Message received.`,
        html: `
          <h2>🎉 Thank you ${name}!</h2>
          <p>Your message has been received and will be replied to soon.</p>
        `
      });
      emailsSent++;

      console.log('✅ GMAIL SMTP: BOTH EMAILS SENT!');
      return res.json({ success: true, message: `2 emails sent via Gmail SMTP!` });

    } catch (smtpError) {
      console.log('❌ GMAIL SMTP FAILED:', smtpError.message);
    }

    // 🔄 TRY 2: EMAILJS (Backup)
    console.log('🔄 FALLBACK: EMAILJS...');
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS env vars missing');
    }

    // EMAIL 1: TO YOU via EmailJS
    const emailjsData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: process.env.RECEIVER_EMAIL,
        from_name: name,
        from_email: email,
        subject: subject,
        message: message
      }
    };

    const response1 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailjsData)
    });

    if (!response1.ok) throw new Error(`EmailJS failed: ${response1.status}`);
    emailsSent++;

    // EMAIL 2: ACK TO USER via EmailJS
    const ackData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_ACK_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_name: name,
        to_email: email,
        from_email: process.env.RECEIVER_EMAIL,
        subject: 'Message received - Thank you!'
      }
    };

    const response2 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ackData)
    });

    if (!response2.ok) throw new Error(`Ack email failed: ${response2.status}`);
    emailsSent++;

    console.log('✅ EMAILJS BACKUP: BOTH EMAILS SENT!');
    res.json({
      success: true,
      message: `2 emails sent via EmailJS backup! (Gmail failed)`
    });

  } catch (error) {
    console.error('❌ BOTH METHODS FAILED:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Both email methods failed',
      code: error.code
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ DUAL BACKUP Backend on port ${PORT}`));
