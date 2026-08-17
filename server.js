const express = require('express');
const { Server } = require('ws');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// CORS icazəsi (Localhost-dan gələn sorğular üçün)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const PORT = process.env.PORT || 3000;

// OTP Kodlarını saxlayan yaddaş
const otpStore = {};

// Nodemailer SMTP Ayarları (Öz Gmail məlumatlarınızı bura yazmalısınız)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'SIZIN_GMAIL@gmail.com',      // Sizin Gmail adresiniz
    pass: 'SIZIN_APP_PASSWORD'          // Google-dan aldığınız 16 rəqəmli Tətbiq Şifrəsi
  }
});

// Gmail-ə Kod Göndərmə
app.post('/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email daxil edin' });

  // Təsadüfi 6 rəqəmli kod
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = code;

  const mailOptions = {
    from: '"WhatsApp Verification"',
    to: email,
    subject: 'WhatsApp Giriş Kodu',
    text: `Sizin doğrulama kodunuz: ${code}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Mail xətası:", error);
      return res.status(500).json({ success: false, message: 'Mail göndərilə bilmədi' });
    }
    res.json({ success: true, message: 'Kod Gmail-ə göndərildi' });
  });
});

// Kodu Təsdiqləmə
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
