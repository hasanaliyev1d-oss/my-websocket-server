const express = require('express');
const http = require('http');
const { Server } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS icazələri
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// HTTP vasitəsilə OTP istəyi (WebSocket-dən daha etibarlıdır)
app.post('/send-otp', (req, res) => {
  const { email } = req.body;
  console.log("OTP istəyi gəldi:", email);
  res.json({ success: true, message: "Kod göndərildi!" });
});

app.get('/', (req, res) => {
  res.send('Server tam aktivdir!');
});

const server = http.createServer(app);
const wss = new Server({ server });

wss.on('connection', (ws) => {
  console.log("İstifadəçi çat otağına qoşuldu");

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'CHAT_MSG') {
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
