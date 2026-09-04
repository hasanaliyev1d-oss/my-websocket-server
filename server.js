const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });
const clients = new Map(); // username -> ws mapping

wss.on('connection', (ws) => {
  let currentUsername = "";

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // 1. QEYDİYYAT
      if (data.type === 'REGISTER') {
        currentUsername = data.username.toLowerCase();
        clients.set(currentUsername, ws);

        // Qoşulma uğurlu
        ws.send(JSON.stringify({ type: 'REGISTER_SUCCESS' }));

        // Aktiv istifadəçilərin siyahısını hamıya göndər
        broadcastUserList();
      }

      // 2. MESAJ GÖNDƏRMƏ
      else if (data.type === 'SEND_MESSAGE') {
        const payload = {
          type: 'NEW_MESSAGE',
          from: currentUsername,
          to: data.to,
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Əgər mesaj ÜMUMİ qrupadırsa -> HAM IYA GÖNDƏR
        if (data.to === 'GLOBAL') {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(payload));
            }
          });
        } 
        // Əgər ŞƏXSİ mesajdırsa -> YALNIZ O İSTİFADƏÇİYƏ VƏ ÖZÜNƏ GÖNDƏR
        else {
          const targetWs = clients.get(data.to.toLowerCase());
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify(payload));
          }
          if (ws !== targetWs && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
          }
        }
      }
    } catch (err) {
      console.error("Xəta:", err);
    }
  });

  ws.on('close', () => {
    if (currentUsername) {
      clients.delete(currentUsername);
      broadcastUserList();
    }
  });
});

function broadcastUserList() {
  const userList = Array.from(clients.keys());
  const payload = JSON.stringify({ type: 'ACTIVE_USERS', users: userList });
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

console.log(`WebSocket Server ${PORT} portunda çalışır.`);
