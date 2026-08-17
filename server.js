const WebSocket = require('ws');
const http = require('http');

// Render üçün vacib olan PORT təyin edilməsi
const port = process.env.PORT || 10000;
const server = http.createServer();

// WebSocket serveri yarat
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Yeni qoşulma aşkarlandı!');

    ws.on('message', (message) => {
        // Gələn mesajı olduğu kimi hamıya payla
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});

server.listen(port, () => {
    console.log(`Server işləyir, port: ${port}`);
});
