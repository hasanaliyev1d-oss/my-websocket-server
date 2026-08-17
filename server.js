const express = require('express');
const http = require('http');
const { Server } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server aktivdir!');
});

const server = http.createServer(app);
const wss = new Server({ server });

// OTP-ləri müvəqqəti saxlamaq üçün
const otpStore = {};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // 1. KOD İSTƏYİ (OTP)
      if (data.type === 'REQUEST_OTP') {
        const email = data.email;
        // Test üçün standart kod: 123456
        otpStore[email] = "123456"; 
        
        ws.send(JSON.stringify({ 
          type: 'OTP_SENT', 
          success: true, 
          message: 'Kod göndərildi! (Test kodu: 123456)' 
        }));
      }

      // 2. KODUN TƏSDİQİ (VERIFY)
      else if (data.type === 'VERIFY_OTP') {
        const { email, code } = data;
        if (otpStore[email] && (otpStore[email] === code || code === "123456")) {
          delete otpStore[email];
          ws.send(JSON.stringify({ type: 'VERIFY_SUCCESS', success: true }));
        } else {
          ws.send(JSON.stringify({ type: 'VERIFY_FAILED', message: 'Kod yanlışdır!' }));
        }
      }

      // 3. CANLI MESAJLAŞMA
      else if (data.type === 'CHAT_MSG') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'CHAT_MSG',
              user: data.user,
              text: data.text
            }));
          }
        });
      }
    } catch (e) {
      console.log("Mesaj xətası:", e);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server işləyir: ${PORT}`);
});
