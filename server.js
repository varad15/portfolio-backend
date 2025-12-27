const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();  // ← THIS WAS MISSING!
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    console.log('📧 FORM DATA RECEIVED:', { name, email, subject, message: message?.substring(0, 100) });

    console.log('🔑 ENV CHECK:', {
      user: process.env.EMAIL_USER ? 'OK' : 'MISSING',
      pass: process.env.EMAIL_PASS ? 'OK' : 'MISSING',
      receiver: process.env.RECEIVER_EMAIL ? 'OK' : 'MISSING'
    });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    console.log('📤 SENDING EMAIL...');
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      replyTo: email,
      subject: `Portfolio: ${subject}`,
      html: `
        <h2>✨ New Message from ${name}</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `
    });

    console.log('✅ EMAIL SENT TO:', process.env.RECEIVER_EMAIL);
    res.json({ success: true, message: 'Email sent!' });
  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Backend on port ${PORT}`));
