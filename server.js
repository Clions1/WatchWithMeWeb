import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ExpressPeerServer } from 'peer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// PeerJS sunucusu
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  allow_discovery: true
});

// PeerJS olaylarını dinle
peerServer.on('connection', (client) => {
  console.log('Yeni bağlantı:', client.getId());
});

peerServer.on('disconnect', (client) => {
  console.log('Bağlantı koptu:', client.getId());
});

app.use('/peerjs', peerServer);

// Statik dosyalar için public klasörünü kullan
app.use(express.static('public'));

// Tüm rotaları index.html'e yönlendir
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
}); 