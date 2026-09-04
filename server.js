const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

// İstfadəçi siyahısı və mesaj tarixçəsi
const users = new Map(); // username -> ws
const globalHistory = [];

wss.on('connection', (ws) => {
  let currentUsername = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      // 1. QEYDİYYAT / GİRİŞ
      if (data.type === 'REGISTER') {
        currentUsername = data.username.trim().toLowerCase();
        users.set(currentUsername, ws);

        // Uğurlu giriş cavabı
        ws.send(JSON.stringify({ type: 'REGISTER_SUCCESS', username: currentUsername }));

        // Bütün istifadəçilərə yenilənmiş siyahını göndər
        broadcastUserList();

        // Keçmiş ümumi mesajları yenidən qoşulan istifadəçiyə yolla
        ws.send(JSON.stringify({ type: 'HISTORY_DATA', peer: 'GLOBAL', history: globalHistory }));
      }

      // 2. MESAJ GÖNDƏRMƏK
      else if (data.type === 'SEND_MESSAGE') {
        const text = data.text ? data.text.trim() : '';
        if (!text) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const target = data.to ? data.to.trim().toUpperCase() : 'GLOBAL';

        const msgPayload = {
          type: 'NEW_MESSAGE',
          from: currentUsername,
          to: target,
          text: text,
          timestamp: timeStr
        };

        if (target === 'GLOBAL') {
          globalHistory.push({
            from: currentUsername,
            to: 'GLOBAL',
            text: text,
            timestamp: timeStr
          });
          if (globalHistory.length > 100) globalHistory.shift(); // Son 100 mesajı saxla

          // Hər kəsə canlı yayımla
          const jsonStr = JSON.stringify(msgPayload);
          users.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(jsonStr);
            }
          });
        } else {
          // Təkli özəl mesajlaşma
          const targetWs = users.get(data.to.trim().toLowerCase());
          const jsonStr = JSON.stringify(msgPayload);

          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(jsonStr);
          }
          // Göndərən şəxsin öz ekranına da mesajı düşür
          if (ws.readyState === WebSocket.OPEN && targetWs !== ws) {
            ws.send(jsonStr);
          }
        }
      }

      // 3. İSTİFADƏÇİ AXTARIŞI
      else if (data.type === 'SEARCH_USER') {
        const query = data.query ? data.query.trim().toLowerCase() : '';
        const filtered = Array.from(users.keys()).filter(u => u.includes(query) && u !== currentUsername);
        ws.send(JSON.stringify({ type: 'SEARCH_RESULTS', users: filtered }));
      }

    } catch (err) {
      console.error("JSON Xətası:", err);
    }
  });

  ws.on('close', () => {
    if (currentUsername) {
      users.delete(currentUsername);
      broadcastUserList();
    }
  });
});

function broadcastUserList() {
  const activeUsers = Array.from(users.keys());
  const data = JSON.stringify({ type: 'ACTIVE_USERS', users: activeUsers });
  users.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

console.log(`Server ${PORT} portunda işə düşdü.`);
