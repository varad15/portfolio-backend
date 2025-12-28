const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // VALIDATE INPUT
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log('📧 FORM DATA:', { name, email, subject, message: message.substring(0, 100) });

    // CHECK ENV VARS
    const missingEnv = [];
    if (!process.env.EMAIL_USER) missingEnv.push('EMAIL_USER');
    if (!process.env.EMAIL_PASS) missingEnv.push('EMAIL_PASS');
    if (!process.env.RECEIVER_EMAIL) missingEnv.push('RECEIVER_EMAIL');

    if (missingEnv.length > 0) {
      console.error('❌ MISSING ENV:', missingEnv);
      return res.status(500).json({ success: false, error: `Missing env: ${missingEnv.join(', ')}` });
    }

    // ✅ FIXED: createTransport (NOT createTransporter)
    const transporter = nodemailer.createTransport({
      service: 'gmail',  // ✅ Render.com compatible
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      pool: true,
      maxConnections: 1,
      connectionTimeout: 10000,
      logger: true,
      debug: true
    });

    // TEST CONNECTION
    await transporter.verify();
    console.log('✅ Gmail SMTP verified');

    // EMAIL 1: TO YOU
    await transporter.sendMail({
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
    console.log('✅ EMAIL 1 SENT TO:', process.env.RECEIVER_EMAIL);

    // EMAIL 2: ACK TO USER
    await transporter.sendMail({
      from: `"Portfolio Bot" <${process.env.EMAIL_USER}>`,
      to: email,
      replyTo: process.env.RECEIVER_EMAIL,
      subject: `✅ Thanks ${name}! Message received.`,
      html: `
        <h2>🎉 Thank you ${name}!</h2>
        <p>Your message has been received and will be replied to soon.</p>
      `
    });
    console.log('✅ EMAIL 2 ACK SENT TO:', email);

    res.json({ success: true, message: '2 emails sent successfully!' });

  } catch (error) {
    console.error('❌ EMAIL ERROR:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Email service failed',
      code: error.code
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
