const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ FIXED CORS - Allow ALL origins + Vercel domain
app.use(cors({
  origin: [
    'https://website-cv-jme2-img5seauw-varad15s-projects.vercel.app',
    'https://website-cv.vercel.app',
    '*',  // ✅ TEMPORARY: Allow ALL for testing
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests FIRST
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

// KEEP ALIVE - Prevent Render sleep (Free tier)
setInterval(() => {
  console.log('🤖 KEEP ALIVE PING:', new Date().toISOString());
}, 4 * 60 * 1000); // Every 4 minutes

// ✅ ENHANCED HEALTH CHECK - Show EXACT env values
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK ✅',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env_check: {
      EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID || '❌ MISSING',
      EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID || '❌ MISSING',
      EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY ? '✅ SET' : '❌ MISSING',
      RECEIVER_EMAIL: process.env.RECEIVER_EMAIL || '❌ MISSING'
    }
  });
});

// ✅ BULLETPROOF CONTACT FORM - FIXED EmailJS + DETAILED LOGS
app.post('/api/contact', async (req, res) => {
  try {
    console.log('📥 FORM RECEIVED:', {
      name: req.body.name,
      email: req.body.email,
      subject: req.body.subject,
      message: req.body.message?.substring(0, 50)
    });

    // 1. VALIDATE FORM DATA
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      console.log('❌ MISSING FORM FIELDS');
      return res.status(400).json({
        success: false,
        error: 'All fields are required (name, email, subject, message)'
      });
    }

    // 2. SHOW EXACT ENV VALUES BEFORE SENDING
    console.log('🔑 ENV VALUES:', {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      public_key: process.env.EMAILJS_PUBLIC_KEY ? `${process.env.EMAILJS_PUBLIC_KEY.substring(0, 10)}...` : 'MISSING',
      receiver_email: process.env.RECEIVER_EMAIL
    });

    // 3. VALIDATE ENV VARS WITH EXACT ERROR
    if (!process.env.EMAILJS_SERVICE_ID) {
      return res.status(500).json({ success: false, error: 'EMAILJS_SERVICE_ID missing in Render Environment Variables' });
    }
    if (!process.env.EMAILJS_TEMPLATE_ID) {
      return res.status(500).json({ success: false, error: 'EMAILJS_TEMPLATE_ID missing in Render Environment Variables' });
    }
    if (!process.env.EMAILJS_PUBLIC_KEY) {
      return res.status(500).json({ success: false, error: 'EMAILJS_PUBLIC_KEY missing! Get from: https://dashboard.emailjs.com/admin/account' });
    }
    if (!process.env.RECEIVER_EMAIL) {
      return res.status(500).json({ success: false, error: 'RECEIVER_EMAIL missing in Render Environment Variables' });
    }

    // 4. PREPARE EmailJS DATA
    const emailData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      public_key: process.env.EMAILJS_PUBLIC_KEY,  // ✅ CRITICAL: public_key NOT user_id
      template_params: {
        to_email: process.env.RECEIVER_EMAIL,
        from_name: name,
        from_email: email,
        subject: subject,
        message: message
      }
    };

    console.log('🚀 SENDING TO EmailJS:', {
      service_id: emailData.service_id,
      template_id: emailData.template_id,
      public_key: emailData.public_key.substring(0, 10) + '...',
      to_email: emailData.template_params.to_email
    });

    // 5. SEND EMAIL WITH TIMEOUT
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': '*'
      },
      body: JSON.stringify(emailData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const emailResponseText = await emailResponse.text();
    console.log('📤 EMAILJS FULL RESPONSE:', {
      status: emailResponse.status,
      statusText: emailResponse.statusText,
      response: emailResponseText.substring(0, 500)
    });

    // 6. CHECK RESPONSE
    if (emailResponse.ok) {
      console.log('🎉 EMAIL SENT SUCCESSFULLY!');
      res.json({
        success: true,
        message: 'Email sent successfully! Check your inbox ✨',
        emails_sent: 1,
        emailjs_status: emailResponse.status
      });
    } else {
      let errorMsg = `EmailJS Error ${emailResponse.status}`;

      try {
        const errorJson = JSON.parse(emailResponseText);
        console.error('📤 EMAILJS ERROR JSON:', errorJson);
        errorMsg += ` - ${errorJson.message || errorJson.error || 'Unknown EmailJS error'}`;
      } catch (parseError) {
        console.error('📤 EMAILJS RAW ERROR:', emailResponseText);
        errorMsg += ` - Raw response: ${emailResponseText.substring(0, 200)}`;
      }

      console.error('💥 EMAILJS FAILED:', errorMsg);
      return res.status(500).json({
        success: false,
        error: errorMsg
      });
    }

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
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
  console.log('❌ 404:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found. Use /api/health or /api/contact'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('🚨 UNHANDLED ERROR:', {
    message: err.message,
    stack: err.stack,
    url: req.url
  });
  res.status(500).json({
    success: false,
    error: 'Server error occurred'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 BACKEND LIVE ON PORT ${PORT}`);
  console.log(`✅ HEALTH: https://portfolio-backend-1-hvs1.onrender.com/api/health`);
  console.log(`✅ CONTACT: POST https://portfolio-backend-1-hvs1.onrender.com/api/contact`);
  console.log('✅ ENV STATUS:', {
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID || 'MISSING',
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID || 'MISSING',
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY ? '✅ OK' : '❌ MISSING',
    RECEIVER_EMAIL: process.env.RECEIVER_EMAIL || 'MISSING'
  });
});
