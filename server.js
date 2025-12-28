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

    // ✅ SINGLE TEMPLATE: template_zlzf0n4 (works for BOTH emails)

    // EMAIL 1: TO YOU (Varad receives full message)
    const toYouData = {
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

    console.log('🔄 EMAIL 1 → Varad...');
    const response1 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toYouData)
    });

    if (!response1.ok) {
      const errData = await response1.json();
      throw new Error(`Email 1 failed: ${response1.status} - ${errData.message || 'Unknown'}`);
    }
    console.log('✅ EMAIL 1 SENT TO:', process.env.RECEIVER_EMAIL);

    // EMAIL 2: ACK TO USER (Same template, different params)
    const ackData = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,  // SAME TEMPLATE!
      public_key: process.env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: email,           // User receives ACK
        from_name: 'Portfolio Team',
        from_email: process.env.RECEIVER_EMAIL,
        subject: `Thanks ${name}! Message received ✨`,
        message: `Hi ${name},\n\nYour message "${subject}" has been received!\n\nI'll reply within 24 hours.\n\nBest,\nPortfolio Team`
      }
    };

    console.log('🔄 EMAIL 2 → User ACK...');
    const response2 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ackData)
    });

    if (!response2.ok) {
      const errData = await response2.json();
      throw new Error(`Email 2 failed: ${response2.status} - ${errData.message || 'Unknown'}`);
    }

    console.log('✅ BOTH EMAILS SENT via single template!');
    res.json({ success: true, message: '2 emails sent successfully!' });

  } catch (error) {
    console.error('❌ EMAILJS ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Single Template Backend on port ${PORT}`));
