const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ BULLETPROOF CORS - ALL YOUR DOMAINS
app.use(cors({
  origin: [
    'https://website-cv-jme2-img5seauw-varad15s-projects.vercel.app',
    'https://website-cv.vercel.app',
    'https://website-cv-jme2-img5seauw-varad15s-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// KEEP ALIVE - Prevent Render sleep (Free tier)
setInterval(() => {
  console.log('🤖 KEEP ALIVE PING:', new Date().toISOString());
}, 4 * 60 * 1000); // Every 4 minutes

// ✅ HEALTH CHECK - Wake up Render + Env status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env_check: {
      has_emailjs_service: !!process.env.EMAILJS_SERVICE_ID,
      has_emailjs_template: !!process.env.EMAILJS_TEMPLATE_ID,
      has_emailjs_key: !!process.env.EMAILJS_PUBLIC_KEY,
      has_receiver_email: !!process.env.RECEIVER_EMAIL,
      receiver_email: process.env.RECEIVER_EMAIL ? 'SET' : 'MISSING'
    }
  });
});

// ✅ BULLETPROOF CONTACT FORM - SINGLE EMAIL FIRST
app.post('/api/contact', async (req, res) => {
  try {
    console.log('📥 FORM RECEIVED:', req.body);

    // 1. VALIDATE FORM DATA
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      console.log('❌ MISSING FORM FIELDS');
      return res.status(400).json({
        success: false,
        error: 'All fields are required (name, email, subject, message)'
      });
    }

    if (name.length < 2 || email.length < 5 || subject.length < 3 || message.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Fields too short. Please provide valid data.'
      });
    }

    // 2. VALIDATE ENV VARS
    if (!process.env.EMAILJS_SERVICE_ID) {
      return res.status(500).json({ success: false, error: 'EMAILJS_SERVICE_ID missing' });
    }
    if (!process.env.EMAILJS_TEMPLATE_ID) {
      return res.status(500).json({ success: false, error: 'EMAILJS_TEMPLATE_ID missing' });
    }
    if (!process.env.EMAILJS_PUBLIC_KEY) {
      return res.status(500).json({ success: false, error: 'EMAILJS_PUBLIC_KEY missing' });
    }
    if (!process.env.RECEIVER_EMAIL) {
      return res.status(500).json({ success: false, error: 'RECEIVER_EMAIL missing' });
    }

    console.log('✅ FORM VALIDATED:', { name, email: email.substring(0, 20) + '...', subject });

    // 3. EMAIL 1: TO YOU (Varad) - FULL MESSAGE
    const emailData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      public_key: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: process.env.RECEIVER_EMAIL,
        from_name: name,
        from_email: email,
        subject: subject,
        message: message
      }
    };

    console.log('🚀 SENDING EMAIL TO VARAD...');
    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': '*'
      },
      body: JSON.stringify(emailData)
    });

    const emailResponseText = await emailResponse.text();
    console.log('📤 EMAILJS RESPONSE:', emailResponse.status, emailResponseText.substring(0, 300));

    if (!emailResponse.ok) {
      let errorMsg = `EmailJS failed: ${emailResponse.status}`;
      try {
        const errorJson = JSON.parse(emailResponseText);
        errorMsg += ` - ${errorJson.message || 'Unknown error'}`;
      } catch {
        errorMsg += ` - ${emailResponseText.substring(0, 100)}`;
      }

      console.error('💥 EMAILJS ERROR:', errorMsg);
      return res.status(500).json({
        success: false,
        error: errorMsg
      });
    }

    console.log('🎉 EMAIL SENT SUCCESSFULLY TO:', process.env.RECEIVER_EMAIL);

    // SUCCESS RESPONSE
    res.json({
      success: true,
      message: 'Email sent successfully! Check your inbox ✨',
      emails_sent: 1
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found. Use /api/health or /api/contact'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('🚨 UNHANDLED ERROR:', err);
  res.status(500).json({
    success: false,
    error: 'Server error occurred'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 BACKEND LIVE: https://portfolio-backend-1-hvs1.onrender.com`);
  console.log(`✅ HEALTH: https://portfolio-backend-1-hvs1.onrender.com/api/health`);
  console.log(`✅ CONTACT: POST https://portfolio-backend-1-hvs1.onrender.com/api/contact`);
  console.log(`✅ PORT: ${PORT}`);
  console.log(`✅ ENV CHECK:`, {
    emailjs_service: !!process.env.EMAILJS_SERVICE_ID,
    emailjs_template: !!process.env.EMAILJS_TEMPLATE_ID,
    emailjs_key: !!process.env.EMAILJS_PUBLIC_KEY,
    receiver_email: !!process.env.RECEIVER_EMAIL
  });
});
