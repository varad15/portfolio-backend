app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    console.log('📧 FORM DATA RECEIVED:', { name, email, subject, message: message?.substring(0, 100) });

    console.log('🔑 ENV VARS CHECK:', {
      hasUser: !!process.env.EMAIL_USER,
      hasPass: !!process.env.EMAIL_PASS,
      hasReceiver: !!process.env.RECEIVER_EMAIL
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
      html: `<h2>New Message from ${name}</h2><p>${message}</p>`
    });

    console.log('✅ EMAIL SENT TO:', process.env.RECEIVER_EMAIL);
    res.json({ success: true, message: 'Email sent!' });
  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
