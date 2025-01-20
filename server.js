const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { v4: uuidv4 } = require('uuid');

const rooms = new Map();

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı');

    socket.on('create-room', ({ username, password }) => {
        const roomId = uuidv4().substring(0, 6);
        
        rooms.set(roomId, {
            host: {
                id: socket.id,
                username
            },
            password,
            viewers: new Map(),
            messages: []
        });

        socket.join(roomId);
        socket.emit('room-created', { roomId });
        io.to(roomId).emit('update-participants', {
            host: rooms.get(roomId).host,
            viewers: Array.from(rooms.get(roomId).viewers.values())
        });
        console.log(`Oda oluşturuldu: ${roomId}`);
    });

    socket.on('join-room', ({ roomId, password, username }) => {
        const room = rooms.get(roomId);
        
        if (!room) {
            socket.emit('error', { message: 'Oda bulunamadı' });
            return;
        }

        if (room.password !== password) {
            socket.emit('error', { message: 'Yanlış şifre' });
            return;
        }

        socket.join(roomId);
        room.viewers.set(socket.id, { id: socket.id, username });
        
        socket.emit('room-joined', { messages: room.messages });
        io.to(roomId).emit('update-participants', {
            host: room.host,
            viewers: Array.from(room.viewers.values())
        });
        io.to(room.host.id).emit('viewer-connected');
        
        console.log(`Kullanıcı odaya katıldı: ${roomId}`);
    });

    socket.on('chat-message', ({ message }) => {
        for (const [roomId, room] of rooms.entries()) {
            if (room.host.id === socket.id || room.viewers.has(socket.id)) {
                const sender = room.host.id === socket.id ? room.host : room.viewers.get(socket.id);
                const messageObj = {
                    id: uuidv4(),
                    sender,
                    message,
                    timestamp: new Date().toISOString()
                };
                room.messages.push(messageObj);
                io.to(roomId).emit('new-message', messageObj);
                break;
            }
        }
    });

    socket.on('offer', ({ offer }) => {
        for (const [roomId, room] of rooms.entries()) {
            if (room.host.id === socket.id) {
                socket.to(roomId).emit('offer', { offer });
                break;
            }
        }
    });

    socket.on('answer', ({ answer }) => {
        for (const [roomId, room] of rooms.entries()) {
            if (room.viewers.has(socket.id)) {
                io.to(room.host.id).emit('answer', { answer });
                break;
            }
        }
    });

    socket.on('ice-candidate', ({ candidate }) => {
        for (const [roomId, room] of rooms.entries()) {
            if (room.host.id === socket.id) {
                socket.to(roomId).emit('ice-candidate', { candidate });
                break;
            } else if (room.viewers.has(socket.id)) {
                io.to(room.host.id).emit('ice-candidate', { candidate });
                break;
            }
        }
    });

    socket.on('disconnect', () => {
        for (const [roomId, room] of rooms.entries()) {
            if (room.host.id === socket.id) {
                rooms.delete(roomId);
                io.to(roomId).emit('error', { message: 'Yayıncı bağlantısı kesildi' });
                break;
            } else if (room.viewers.has(socket.id)) {
                room.viewers.delete(socket.id);
                io.to(roomId).emit('update-participants', {
                    host: room.host,
                    viewers: Array.from(room.viewers.values())
                });
                break;
            }
        }
        console.log('Bir kullanıcı ayrıldı');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
}); 