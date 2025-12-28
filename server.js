const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app', 'http://localhost:5173'], // Add your domains
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body ? Object.keys(req.body) : 'no body');
  next();
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// FINAL BULLETPROOF CONTACT ENDPOINT
app.post('/api/contact', async (req, res) => {
  try {
    // 1. VALIDATE INPUT
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message || name.length < 2 || email.length < 5) {
      return res.status(400).json({ success: false, error: 'Invalid form data' });
    }

    // 2. VALIDATE ENV VARS
    const requiredEnv = {
      EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
      EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
      RECEIVER_EMAIL: process.env.RECEIVER_EMAIL
    };

    const missingEnv = Object.entries(requiredEnv).filter(([key, value]) => !value);
    if (missingEnv.length > 0) {
      console.error('❌ MISSING ENV:', missingEnv.map(([k]) => k));
      return res.status(500).json({ success: false, error: `Missing env vars: ${missingEnv.map(([k]) => k).join(', ')}` });
    }

    console.log('📧 FORM DATA OK:', { name, email, subject: subject.substring(0, 30), message: message.substring(0, 50) });

    // 3. EMAILJS FUNCTION (Reusable)
    const sendEmailJS = async (params, type) => {
      const payload = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        public_key: process.env.EMAILJS_PUBLIC_KEY,
        template_params: params
      };

      console.log(`🔄 ${type} PAYLOAD:`, {
        to_email: params.to_email?.substring(0, 20) + '...',
        from_name: params.from_name,
        subject: params.subject?.substring(0, 30)
      });

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': '*'
        },
        body: JSON.stringify(payload),
        timeout: 15000
      });

      const responseText = await response.text();
      console.log(`📤 ${type} RAW RESP [${response.status}]:`, responseText.substring(0, 300));

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`${type} failed: ${response.status} - ${errorData.message || 'Unknown EmailJS error'}`);
        } catch {
          throw new Error(`${type} failed: ${response.status} - ${responseText.substring(0, 100)}`);
        }
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { status: 'success' };
      }

      return result;
    };

    // 4. SEND EMAIL 1: TO VARAD (Full details)
    await sendEmailJS({
      to_email: process.env.RECEIVER_EMAIL,
      from_name: name,
      from_email: email,
      subject: subject,
      message: message
    }, 'EMAIL 1 → Varad');

    // 5. SEND EMAIL 2: ACK TO USER
    await sendEmailJS({
      to_email: email,
      from_name: 'Portfolio Team',
      from_email: process.env.RECEIVER_EMAIL,
      subject: `Thanks ${name}! Message received ✨`,
      message: `Hi ${name},

🎉 Your message "${subject}" has been received successfully!

I'll review it and reply within 24 hours.

Best regards,
Portfolio Team

---
Original message: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`
    }, 'EMAIL 2 → User ACK');

    console.log('🎉 BOTH EMAILS SENT SUCCESSFULLY!');
    res.json({
      success: true,
      message: '2 emails sent successfully! ✨'
    });

  } catch (error) {
    console.error('💥 FINAL ERROR:', {
      message: error.message,
      stack: error.stack?.substring(0, 300)
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Email service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ BULLETPROOF Backend running → http://localhost:${PORT}`);
  console.log('✅ Health: http://localhost:%d/api/health', PORT);
});
