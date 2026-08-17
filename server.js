const express = require('express');
const { Server } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

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
