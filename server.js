const express = require('express');
const http = require('http');
const { Server } = require('ws');
const cors = require('cors');

const app = express();

// Bütün CORS və OPTIONS sorğularına tam icazə veririk
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// OTP-ləri saxlayan obyekt
const otpStore = {};

// Test üçün OTP göndərmə (Hər zaman 123456 kodunu qəbul edə bilər və ya təsadüfi)
app.post('/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email daxil edin' });

  // Standart test kodu (istəsəniz təsadüfi də edə bilərsiniz)
  otpStore[email] = "123456";
  console.log(`Email: ${email} üçün kod: 123456`);

  return res.json({ success: true, message: 'Kod göndərildi! Test kodu: 123456' });
});

// OTP Təsdiqləmə
app.post('/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (otpStore[email] && (otpStore[email] === code || code === "123456")) {
    delete otpStore[email];
    return res.json({ success: true });
  }
  return res.status(400).json({ success: false, message: 'Kod yanlışdır!' });
});

app.get('/', (req, res) => {
  res.send('Server aktivdir!');
});

const server = http.createServer(app);
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
