const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

// Aktiv istifadəçilər və mesaj bazası
const users = new Map(); // username -> ws
const messageHistory = []; 

wss.on('connection', (ws) => {
  let currentUsername = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'REGISTER':
          currentUsername = message.username.trim().toLowerCase();
          users.set(currentUsername, ws);
          
          // Girişin uğurlu olduğunu təsdiqlə
          ws.send(JSON.stringify({ type: 'REGISTER_SUCCESS', username: currentUsername }));
          
          // Aktiv istifadəçi siyahısını hamıya göndər
          broadcastUserList();
          break;

        case 'SEARCH_USER':
          const query = message.query.trim().toLowerCase();
          const found = Array.from(users.keys()).filter(u => u.includes(query) && u !== currentUsername);
          ws.send(JSON.stringify({ type: 'SEARCH_RESULTS', users: found }));
          break;

        case 'SEND_MESSAGE':
          const { to, text } = message;
          const msgObject = {
            from: currentUsername,
            to: to.toLowerCase(),
            text: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          messageHistory.push(msgObject);

          // EĞƏR ÜMUMİ ÇATDIRSA (GLOBAL) -> HƏR KƏSƏ GÖNDƏR
          if (to.toUpperCase() === 'GLOBAL') {
            const globalData = JSON.stringify({ type: 'NEW_MESSAGE', message: msgObject });
            users.forEach((userWs) => {
              if (userWs.readyState === WebSocket.OPEN) {
                userWs.send(globalData);
              }
            });
          } else {
            // ŞƏXSİ MESAJ -> YALNIZ ALICI VƏ GÖNDƏRƏNƏ
            const targetSocket = users.get(to.toLowerCase());
            if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
              targetSocket.send(JSON.stringify({ type: 'NEW_MESSAGE', message: msgObject }));
            }
            // Göndərənə təsdiq mesajı
            if (targetSocket !== ws) {
              ws.send(JSON.stringify({ type: 'NEW_MESSAGE', message: msgObject }));
            }
          }
          break;

        case 'GET_HISTORY':
          const peer = message.peer.toLowerCase();
          let history = [];

          if (peer === 'global') {
            // Ümumi çatın keçmiş mesajları
            history = messageHistory.filter(m => m.to === 'global');
          } else {
            // Şəxsi çatın keçmiş mesajları
            history = messageHistory.filter(
              m => (m.from === currentUsername && m.to === peer) || (m.from === peer && m.to === currentUsername)
            );
          }
          
          ws.send(JSON.stringify({ type: 'HISTORY_DATA', peer: message.peer, history: history }));
          break;
      }
    } catch (e) {
      console.error("Xəta:", e);
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

console.log(`WebSocket server running on port ${PORT}`);
