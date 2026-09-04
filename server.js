const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });
const clients = new Map();

wss.on('connection', (ws) => {
  let currentUser = "";

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'REGISTER') {
        currentUser = data.username;
        clients.set(currentUser, ws);
        broadcastUserList();
      } 
      else if (data.type === 'SEND_MESSAGE') {
        const payload = JSON.stringify({
          type: 'NEW_MESSAGE',
          from: data.from,
          to: data.to,
          text: data.text,
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // Bütün aktiv istifadəçilərə mesajı yolla (Broadcast)
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client !== ws) {
            client.send(payload);
          }
        });
      }
    } catch (e) {
      console.error("Xəta:", e);
    }
  });

  ws.on('close', () => {
    if (currentUser) {
      clients.delete(currentUser);
      broadcastUserList();
    }
  });
});

function broadcastUserList() {
  const users = Array.from(clients.keys());
  const payload = JSON.stringify({ type: 'ACTIVE_USERS', users: users });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

console.log(`WebSocket Server running on port ${PORT}`);
