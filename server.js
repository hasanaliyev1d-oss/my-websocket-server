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

const otpStore = {};

wss.on('connection', (ws) => {
  console.log("Yeni istifadəçi qoşuldu");

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // KOD İSTƏYİ (OTP)
      if (data.type === 'REQUEST_OTP') {
        const email = data.email;
        otpStore[email] = "123456"; 
        
        ws.send(JSON.stringify({ 
          type: 'OTP_SENT', 
          success: true, 
          message: 'Kod göndərildi!' 
        }));
      }

      // KODUN TƏSDİQİ
      else if (data.type === 'VERIFY_OTP') {
        const { email, code } = data;
        if (otpStore[email] && (otpStore[email] === code || code === "123456")) {
          delete otpStore[email];
          ws.send(JSON.stringify({ type: 'VERIFY_SUCCESS', success: true }));
        } else {
          ws.send(JSON.stringify({ type: 'VERIFY_FAILED', message: 'Kod yanlışdır!' }));
        }
      }

      // CANLI MESAJLAŞMA
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
