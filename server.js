const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log('📧 FORM DATA:', { name, email, subject, message: message.substring(0, 100) });

    // ✅ EMAILJS ONLY - FIXED 403
    if (!process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS env vars missing');
    }

    // EMAIL 1: TO YOU (Main Template)
    const emailjsData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      public_key: process.env.EMAILJS_PUBLIC_KEY,  // ✅ FIXED: public_key not user_id
      template_params: {
        to_email: process.env.RECEIVER_EMAIL,
        from_name: name,
        from_email: email,
        subject: subject,
        message: message
      }
    };

    console.log('🔄 SENDING EMAIL 1 via EmailJS...');
    const response1 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': '*'  // ✅ CORS fix
      },
      body: JSON.stringify(emailjsData)
    });

    const response1Data = await response1.json();
    console.log('EMAILJS Response 1:', response1.status, response1Data);

    if (!response1.ok) {
      throw new Error(`EmailJS failed: ${response1.status} - ${response1Data.message || 'Unknown'}`);
    }

    console.log('✅ EMAIL 1 SENT TO:', process.env.RECEIVER_EMAIL);

    // EMAIL 2: ACK TO USER
    const ackData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_ACK_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID,
      public_key: process.env.EMAILJS_PUBLIC_KEY,  // ✅ FIXED
      template_params: {
        to_name: name,
        to_email: email,
        from_email: process.env.RECEIVER_EMAIL,
        message: 'Thank you for your message! We will reply soon.'
      }
    };

    console.log('🔄 SENDING EMAIL 2 (ACK) via EmailJS...');
    const response2 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': '*'
      },
      body: JSON.stringify(ackData)
    });

    const response2Data = await response2.json();
    console.log('EMAILJS Response 2:', response2.status, response2Data);

    if (!response2.ok) {
      throw new Error(`Ack email failed: ${response2.status} - ${response2Data.message || 'Unknown'}`);
    }

    console.log('✅ BOTH EMAILS SENT via EmailJS!');
    res.json({
      success: true,
      message: '2 emails sent successfully via EmailJS!'
    });

  } catch (error) {
    console.error('❌ EMAILJS ERROR:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Email service failed'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ EmailJS Backend on port ${PORT}`));
