const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    console.log('📧 New contact:', { name, email, subject: subject.substring(0, 50) });

    let emailSent = false;

    // ✅ TRY 1: Gmail (Backend)
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'no-reply@portfolio.com',
        to: process.env.RECEIVER_EMAIL || 'varad9506@gmail.com',
        replyTo: email,
        subject: `Portfolio Contact: ${subject}`,
        html: `
          <h2>New Message from ${name}</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
        `
      });
      console.log('✅ Gmail sent!');
      emailSent = true;
    } catch (gmailError) {
      console.warn('⚠️ Gmail failed:', gmailError.message);
    }

    // ✅ TRY 2: EmailJS (Same as Frontend - KNOWN WORKING)
    if (!emailSent) {
      try {
        const emailjs = require('@emailjs/browser');
        await emailjs.send(
          process.env.VITE_EMAILJS_SERVICE_ID || 'service_qtxd8v9',
          process.env.VITE_EMAILJS_TEMPLATE_ID || 'template_your_main_id',
          {
            from_name: name,
            to_email: process.env.RECEIVER_EMAIL || 'varad9506@gmail.com',
            subject: subject,
            message: message,
            reply_to: email
          },
          process.env.VITE_EMAILJS_PUBLIC_KEY || '8PJKWRXyHaCA_2tC_'
        );
        console.log('✅ EmailJS backup sent!');
        emailSent = true;
      } catch (emailjsError) {
        console.error('❌ EmailJS also failed:', emailjsError);
      }
    }

    if (emailSent) {
      res.json({ success: true, message: 'Email sent!' });
    } else {
      res.status(500).json({ success: false, error: 'All email services failed' });
    }

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend on port ${PORT}`));
