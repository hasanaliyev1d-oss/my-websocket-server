const WebSocket = require('ws');
const http = require('http');

// Render üçün vacib port
const port = process.env.PORT || 10000;
const server = http.createServer();

// WebSocket serveri başladırıq
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Yeni istifadəçi qoşuldu.');

    ws.on('message', (data) => {
        const message = data.toString();
        
        // Gələn mesajı bütün bağlı olan istifadəçilərə (broadcast) paylayırıq
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('İstifadəçi ayrıldı.');
    });
});

server.listen(port, () => {
    console.log(`Server ${port} portunda işə düşdü!`);
});
