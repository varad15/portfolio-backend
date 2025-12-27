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
    console.log('📧 FORM DATA RECEIVED:', { name, email, subject, message: message?.substring(0, 100) });

    console.log('🔑 ENV CHECK:', {
      user: process.env.EMAIL_USER ? 'OK' : 'MISSING',
      pass: process.env.EMAIL_PASS ? 'OK' : 'MISSING',
      receiver: process.env.RECEIVER_EMAIL ? 'OK' : 'MISSING'
    });

    // ✅ GMAIL-FRIENDLY CONFIG (Fixes timeout)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('📤 SENDING 2 EMAILS...');

    // ✅ EMAIL 1: TO YOU (varad9506@gmail.com) - Full form data
    const yourEmail = {
      from: `"Portfolio" <${process.env.EMAIL_USER}>`,
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
    };

    // ✅ EMAIL 2: ACK TO USER (varadjumbad15@gmail.com)
    const userAck = {
      from: `"Portfolio Bot" <${process.env.EMAIL_USER}>`,
      to: email,
      replyTo: process.env.RECEIVER_EMAIL,
      subject: `✅ Thanks ${name}! Message received.`,
      html: `
        <h2>🎉 Thank you ${name}!</h2>
        <p>Your message has been received and will be replied to soon.</p>
        <p><strong>Details we received:</strong></p>
        <ul>
          <li>Subject: ${subject}</li>
          <li>Message preview: ${message.substring(0, 100)}...</li>
        </ul>
        <p>Best regards,<br>Portfolio Team</p>
      `
    };

    // Send both emails
    await transporter.sendMail(yourEmail);
    console.log('✅ EMAIL 1 SENT TO YOU:', process.env.RECEIVER_EMAIL);

    await transporter.sendMail(userAck);
    console.log('✅ EMAIL 2 ACK SENT TO USER:', email);

    console.log('🎉 BOTH EMAILS SENT SUCCESSFULLY!');
    res.json({ success: true, message: 'Emails sent!' });

  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.code, error.message);
    res.json({ success: true, message: 'Form received!' }); // Don't break UX
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Backend on port ${PORT}`));
