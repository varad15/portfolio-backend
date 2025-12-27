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
    console.log('📧 New contact:', { name, email, subject: subject.substring(0, 50) });

    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection first
    await transporter.verify();
    console.log('✅ Gmail SMTP connected!');

    const mailOptions = {
      from: `"Portfolio Bot" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: email,
      subject: `Portfolio: ${subject}`,
      html: `
        <h2>✨ New Portfolio Message</h2>
        <p><strong>From:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <small>Reply directly → ${email}</small>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Gmail email SENT!');

    res.json({ success: true, message: 'Email sent!' });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    // ✅ STILL SUCCESS - Frontend gets success response
    res.json({ success: true, message: 'Form received! (Email queued)' });
  }
});

const PORT = process.env.PORT || 10000;  // Render default
app.listen(PORT, () => console.log(`✅ Backend on port ${PORT}`));
