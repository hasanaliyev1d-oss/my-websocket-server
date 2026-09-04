const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

const users = new Map(); // username -> ws
const messageHistory = []; 

wss.on('connection', (ws) => {
  let currentUsername = null;

  ws.on('message', (messageRaw) => {
    try {
      const message = JSON.parse(messageRaw);

      if (message.type === 'REGISTER') {
        currentUsername = message.username.trim().toLowerCase();
        users.set(currentUsername, ws);
        
        // Giriş təsdiqini dərhal göndər
        ws.send(JSON.stringify({ type: 'REGISTER_SUCCESS', username: currentUsername }));
        
        // Aktiv istifadəçiləri yenilə
        broadcastUserList();
      } 
      
      else if (message.type === 'SEARCH_USER') {
        const query = message.query.trim().toLowerCase();
        const found = Array.from(users.keys()).filter(u => u.includes(query) && u !== currentUsername);
        ws.send(JSON.stringify({ type: 'SEARCH_RESULTS', users: found }));
      } 
      
      else if (message.type === 'SEND_MESSAGE') {
        const { to, text } = message;
        const msgObject = {
          from: currentUsername,
          to: to.toLowerCase(),
          text: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        messageHistory.push(msgObject);

        if (to.toUpperCase() === 'GLOBAL') {
          const globalData = JSON.stringify({ type: 'NEW_MESSAGE', message: msgObject });
          users.forEach((userWs) => {
            if (userWs.readyState === WebSocket.OPEN) {
              userWs.send(globalData);
            }
          });
        } else {
          const targetSocket = users.get(to.toLowerCase());
          if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(JSON.stringify({ type: 'NEW_MESSAGE', message: msgObject }));
          }
          if (targetSocket !== ws) {
            ws.send(JSON.stringify({ type: 'NEW_MESSAGE', message: msgObject }));
          }
        }
      } 
      
      else if (message.type === 'GET_HISTORY') {
        const peer = message.peer.toLowerCase();
        let history = [];

        if (peer === 'global') {
          history = messageHistory.filter(m => m.to === 'global');
        } else {
          history = messageHistory.filter(
            m => (m.from === currentUsername && m.to === peer) || (m.from === peer && m.to === currentUsername)
          );
        }
        
        ws.send(JSON.stringify({ type: 'HISTORY_DATA', peer: message.peer, history: history }));
      }
    } catch (e) {
      console.error("Mesaj emal xətası:", e);
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

console.log(`Server running on port ${PORT}`);
