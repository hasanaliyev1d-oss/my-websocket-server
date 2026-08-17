const express = require('express');
const { Server } = require('ws');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// OTP Kodlarını yaddaşda saxlamaq üçün
const otpStore = {};

// Nodemailer SMTP Ayarları (Gmail üçün)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'SİZİN_GMAIL_ADRESİNİZ@gmail.com', // E-poçt göndərən Gmail hesabınız
    pass: 'SİZİN_GMAIL_APP_PASSWORD'        // Google App Password
  }
});

// Gmail-ə Kod Göndərmə Endpoint-i
app.post('/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email daxil edin' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = code;

  const mailOptions = {
    from: '"WhatsApp Verification" <SİZİN_GMAIL_ADRESİNİZ@gmail.com>',
    to: email,
    subject: 'WhatsApp Giriş Kodu',
    text: `Sizin giriş doğrulama kodunuz: ${code}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: 'Kod göndərilə bilmədi' });
    }
    res.json({ success: true, message: 'Kod Gmail ünvanınıza göndərildi' });
  });
});

// Kod Təsdiqləmə Endpoint-i
app.post('/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (otpStore[email] && otpStore[email] === code) {
    delete otpStore[email];
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, message: 'Kod yanlışdır!' });
});

app.get('/', (req, res) => res.send('Server aktivdir!'));

const server = app.listen(PORT, () => console.log(`Server işləyir: ${PORT}`));
const wss = new Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(message.toString());
      }
    });
  });
});
