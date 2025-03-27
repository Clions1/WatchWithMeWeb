const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB bağlantısı
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB bağlantısı başarılı'))
    .catch(err => console.error('MongoDB bağlantı hatası:', err));

// Contact modelini içe aktar
const Contact = require('./models/Contact');
// Admin modelini içe aktar
const Admin = require('./models/Admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Public klasörünü statik dosyalar için kullan
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // JSON verilerini işlemek için

// Odaları ve mesajları saklamak için
const rooms = {};
// İletişim formlarını geçici saklamak için (artık veritabanında saklanacak)
const contactMessages = [];

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin sayfası yönlendirmesi
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin panel için API endpoint
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // MongoDB'den admin kullanıcısını bul
        const admin = await Admin.findOne({ username });
        
        // Admin bulunamadıysa veya şifre yanlışsa
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
        }
        
        // Şifre karşılaştırması
        const isMatch = await admin.comparePassword(password);
        
        if (isMatch) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
        }
    } catch (error) {
        console.error('Admin girişi hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// İletişim mesajlarını getir - MongoDB'den alınacak
app.get('/api/admin/messages', async (req, res) => {
    try {
        // Mesajları tarihe göre sırala, en yeniler üstte
        const messages = await Contact.find().sort({ date: -1 });
        res.json(messages);
    } catch (error) {
        console.error('Mesajları getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// İletişim formu gönderim endpoint'i - MongoDB'ye kaydedecek
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur' });
    }
    
    try {
        // Yeni mesaj oluştur
        const newMessage = new Contact({
            name,
            email,
            subject,
            message
        });
        
        // Veritabanına kaydet
        await newMessage.save();
        
        res.json({ success: true, message: 'Mesajınız başarıyla gönderildi' });
    } catch (error) {
        console.error('Mesaj kaydetme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// İletişim mesajını okundu/okunmadı olarak işaretle - MongoDB'de güncellenecek
app.put('/api/admin/messages/:id', async (req, res) => {
    const { id } = req.params;
    const { read } = req.body;
    
    try {
        const updatedMessage = await Contact.findByIdAndUpdate(
            id, 
            { read }, 
            { new: true }
        );
        
        if (updatedMessage) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Mesaj bulunamadı' });
        }
    } catch (error) {
        console.error('Mesaj güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// İletişim mesajını sil - MongoDB'den silinecek
app.delete('/api/admin/messages/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const deletedMessage = await Contact.findByIdAndDelete(id);
        
        if (deletedMessage) {
            res.json({ success: true, message: 'Mesaj silindi' });
        } else {
            res.status(404).json({ success: false, message: 'Mesaj bulunamadı' });
        }
    } catch (error) {
        console.error('Mesaj silme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// Sistem istatistiklerini getir
app.get('/api/admin/stats', async (req, res) => {
    // Gerçek bir uygulamada burada kimlik doğrulama yapılmalı
    
    try {
        // Aktif oda sayısı
        const activeRooms = Object.keys(rooms).length;
        
        // Toplam kullanıcı sayısı (host + viewers)
        let totalUsers = 0;
        Object.values(rooms).forEach(room => {
            // Host + viewers
            totalUsers += 1 + room.viewers.length;
        });
        
        // Toplam mesaj sayısı
        let totalMessages = 0;
        Object.values(rooms).forEach(room => {
            totalMessages += room.messages.length;
        });
        
        // İletişim mesajı sayısı - MongoDB'den al
        const contactMessagesCount = await Contact.countDocuments();
        
        // Sunucu başlangıç zamanı (şimdilik şu anki zamandan 1 saat önce olarak simüle ediyoruz)
        const serverStartTime = new Date(Date.now() - 3600000); // 1 saat önce
        const uptime = Math.floor((Date.now() - serverStartTime) / (1000 * 60 * 60)); // saat cinsinden
        
        res.json({
            success: true,
            stats: {
                activeRooms,
                totalUsers,
                totalMessages,
                contactMessagesCount,
                uptime
            }
        });
    } catch (error) {
        console.error('İstatistikleri getirme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// Socket.io bağlantıları
io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı:', socket.id);

    // Oda oluşturma işlemi
    socket.on('create-room', ({ username, password }) => {
        try {
            // Benzersiz oda ID oluştur
            const roomId = uuidv4().substring(0, 8);
            
            // Odayı oluştur ve kullanıcıyı host olarak ayarla
            rooms[roomId] = {
                id: roomId,
                host: {
                    id: socket.id,
                    username
                },
                viewers: [],
                password,
                messages: [],
                isPaused: false, // Ekran paylaşımı durumu için yeni alan
                usedUsernames: [username] // Kullanılmış kullanıcı adlarını takip etmek için yeni alan
            };
            
            // Kullanıcıyı odaya sok
            socket.join(roomId);
            
            // Oda oluşturulduğunu bildir
            socket.emit('room-created', { roomId });
            
            console.log(`'${username}' kullanıcısı '${roomId}' odasını oluşturdu`);
            
            // Katılımcı listesini güncelle
            io.to(roomId).emit('update-participants', {
                host: rooms[roomId].host,
                viewers: rooms[roomId].viewers
            });
        } catch (error) {
            console.error('Oda oluşturma hatası:', error);
            socket.emit('error', { message: 'Oda oluşturulurken bir hata oluştu.' });
        }
    });

    // Odaya katılma işlemi
    socket.on('join-room', ({ roomId, password, username }) => {
        // Oda var mı kontrol et
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Oda bulunamadı.' });
            return;
        }
        
        // Şifre doğru mu kontrol et
        if (rooms[roomId].password !== password) {
            socket.emit('error', { message: 'Şifre hatalı.' });
            return;
        }
        
        // Kullanıcı adı kullanılıyor mu kontrol et
        const usernameExists = rooms[roomId].viewers.some(viewer => viewer.username === username) || 
                               rooms[roomId].host.username === username || 
                               rooms[roomId].usedUsernames.includes(username);
        
        if (usernameExists) {
            socket.emit('error', { message: 'Bu kullanıcı adı zaten kullanılıyor.' });
            return;
        }
        
        // Kullanıcıyı izleyici olarak ekle
        const viewer = { id: socket.id, username };
        rooms[roomId].viewers.push(viewer);
        rooms[roomId].usedUsernames.push(username);
        
        // Kullanıcıyı odaya sok
        socket.join(roomId);
        
        // Kullanıcıya odaya katıldığını bildir ve mesaj geçmişini gönder
        socket.emit('room-joined', { messages: rooms[roomId].messages });
        
        // Host'a bir izleyicinin bağlandığını bildir
        socket.to(rooms[roomId].host.id).emit('viewer-connected', { viewerId: socket.id });
        
        console.log(`'${username}' kullanıcısı '${roomId}' odasına katıldı`);
        
        // Katılımcı listesini güncelle
        io.to(roomId).emit('update-participants', {
            host: rooms[roomId].host,
            viewers: rooms[roomId].viewers
        });
        
        // Eğer yayın durdurulmuşsa yeni kullanıcıya bildir
        if (rooms[roomId].isPaused) {
            socket.emit('stream-paused');
        }
    });

    // WebRTC Offer mesajını iletiyor
    socket.on('offer', ({ offer, viewerId }) => {
        socket.to(viewerId).emit('offer', { offer, hostId: socket.id });
    });

    // WebRTC Answer mesajını iletiyor
    socket.on('answer', ({ answer, hostId }) => {
        socket.to(hostId).emit('answer', { answer });
    });

    // ICE adaylarını iletiyor
    socket.on('ice-candidate', ({ candidate }) => {
        const roomId = Object.keys(rooms).find(roomId => 
            rooms[roomId].host.id === socket.id || 
            rooms[roomId].viewers.some(viewer => viewer.id === socket.id)
        );
        
        if (!roomId) return;
        
        socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Chat mesajı gönderme
    socket.on('chat-message', ({ message, roomId }) => {
        // Oda var mı kontrol et
        if (!rooms[roomId]) return;
        
        // Gönderen kimdir?
        let sender;
        
        if (rooms[roomId].host.id === socket.id) {
            sender = rooms[roomId].host;
        } else {
            sender = rooms[roomId].viewers.find(viewer => viewer.id === socket.id);
        }
        
        if (!sender) return;
        
        // Mesaj bilgisini oluştur
        const messageInfo = {
            sender,
            message,
            timestamp: new Date()
        };
        
        // Mesajı kaydet
        rooms[roomId].messages.push(messageInfo);
        
        // Herkese ilet
        io.to(roomId).emit('new-message', messageInfo);
    });

    // Ekran paylaşımı duraklatma
    socket.on('stream-paused', ({ roomId, targetViewerId }) => {
        // Oda var mı kontrol et
        if (!rooms[roomId]) return;
        
        // Yayıncı yetkisi kontrolü
        if (rooms[roomId].host.id !== socket.id) {
            socket.emit('error', { message: 'Bu işlem için yetkiniz yok.' });
            return;
        }
        
        // Durumu güncelle
        rooms[roomId].isPaused = true;
        
        // Eğer belirli bir izleyiciye bildirim gönderilecekse
        if (targetViewerId) {
            socket.to(targetViewerId).emit('stream-paused');
        } else {
            // Tüm izleyicilere bildir (host hariç)
            socket.to(roomId).emit('stream-paused');
        }
    });

    // Ekran paylaşımı devam ettirme
    socket.on('stream-resumed', ({ roomId }) => {
        // Oda var mı kontrol et
        if (!rooms[roomId]) return;
        
        // Yayıncı yetkisi kontrolü
        if (rooms[roomId].host.id !== socket.id) {
            socket.emit('error', { message: 'Bu işlem için yetkiniz yok.' });
            return;
        }
        
        // Durumu güncelle
        rooms[roomId].isPaused = false;
        
        // Tüm izleyicilere bildir (host hariç)
        socket.to(roomId).emit('stream-resumed');
    });

    // Odadan ayrılma
    socket.on('leave-room', ({ roomId, username }) => {
        handleDisconnect(socket.id, roomId, username);
    });

    // Bağlantı kopması
    socket.on('disconnect', () => {
        console.log('Kullanıcı bağlantısı kesildi:', socket.id);
        
        // Tüm odalarda ara
        Object.keys(rooms).forEach(roomId => {
            // Host mu kontrol et
            if (rooms[roomId].host.id === socket.id) {
                handleDisconnect(socket.id, roomId, rooms[roomId].host.username);
            }
            
            // İzleyici mi kontrol et
            const viewerIndex = rooms[roomId].viewers.findIndex(viewer => viewer.id === socket.id);
            
            if (viewerIndex >= 0) {
                const username = rooms[roomId].viewers[viewerIndex].username;
                handleDisconnect(socket.id, roomId, username);
            }
        });
    });
});

// Bağlantı kopması ve odadan ayrılma işlemleri
function handleDisconnect(socketId, roomId, username) {
    // Oda var mı kontrol et
    if (!rooms[roomId]) return;
    
    // Host mu, izleyici mi?
    const isHost = rooms[roomId].host.id === socketId;
    
    if (isHost) {
        // Host ayrılırsa odayı kapat
        io.to(roomId).emit('host-disconnected', { message: 'Yayıncı odadan ayrıldı. Oda kapatılıyor.' });
        
        // Tüm kullanıcıları odadan çıkar
        io.socketsLeave(roomId);
        
        // Odayı sil
        delete rooms[roomId];
        
        console.log(`'${username}' kullanıcısı (host) '${roomId}' odasından ayrıldı. Oda kapatıldı.`);
    } else {
        // İzleyiciyi odadan çıkar
        const viewerIndex = rooms[roomId].viewers.findIndex(viewer => viewer.id === socketId);
        
        if (viewerIndex >= 0) {
            // İzleyiciyi listeden kaldır
            rooms[roomId].viewers.splice(viewerIndex, 1);
            
            // Diğer kullanıcılara bildir
            io.to(roomId).emit('user-disconnected', { username });
            
            // Katılımcı listesini güncelle
            io.to(roomId).emit('update-participants', {
                host: rooms[roomId].host,
                viewers: rooms[roomId].viewers
            });
            
            console.log(`'${username}' kullanıcısı '${roomId}' odasından ayrıldı`);
        }
    }
}

// Sunucuyu başlat
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});