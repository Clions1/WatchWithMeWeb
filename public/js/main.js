let localStream = null;
let currentUser = null;
let isHost = false;
let isStreamStarted = false;
let peer = null;
let connections = new Map(); // Aktif bağlantıları tutmak için
let roomId = null;
let hostConnection = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let isReconnecting = false;
let currentHost = null;
let participants = []; // Katılımcı listesi

const createRoomForm = document.getElementById('createRoomForm');
const joinRoomForm = document.getElementById('joinRoomForm');
const streamContainer = document.getElementById('streamContainer');
const streamVideo = document.getElementById('streamVideo');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const participantsList = document.getElementById('participantsList');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const startStreamBtn = document.getElementById('startStreamBtn');
const streamStatus = document.getElementById('streamStatus');

// Güvenli oda ID'si oluştur
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 8;
    let result = '';
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}

// Temiz bağlantı kapatma
function cleanupConnection() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (peer) {
        peer.destroy();
        peer = null;
    }
    
    connections.forEach((connData) => {
        if (connData.connection) {
            connData.connection.close();
        }
    });
    connections.clear();
    
    if (hostConnection) {
        hostConnection.close();
        hostConnection = null;
    }
    
    streamVideo.srcObject = null;
}

// Yeniden bağlanma mantığı
async function reconnect(userId) {
    if (isReconnecting) return;
    
    isReconnecting = true;
    reconnectAttempts++;
    
    console.log(`Yeniden bağlanma denemesi ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        alert('Bağlantı kurulamadı. Lütfen sayfayı yenileyin.');
        location.reload();
        return;
    }
    
    try {
        cleanupConnection();
        await new Promise(resolve => setTimeout(resolve, 2000));
        initializePeer(userId);
    } catch (error) {
        console.error('Yeniden bağlanma hatası:', error);
        setTimeout(() => reconnect(userId), 5000);
    } finally {
        isReconnecting = false;
    }
}

// PeerJS bağlantısını başlat
function initializePeer(userId) {
    if (!userId) {
        console.error('Geçersiz kullanıcı ID\'si');
        return;
    }

    cleanupConnection();

    const peerOptions = {
        host: window.location.hostname,
        port: window.location.port || 3000,
        path: '/peerjs',
        debug: 3,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        },
        pingInterval: 5000,
        retryTimer: 1000
    };

    console.log('PeerJS bağlantısı başlatılıyor...', peerOptions);
    peer = new Peer(userId, peerOptions);

    peer.on('open', (id) => {
        console.log('PeerJS bağlantısı başarılı, ID:', id);
        reconnectAttempts = 0;
        
        if (isHost) {
            roomId = id;
            roomIdDisplay.textContent = roomId;
            showStreamContainer();
            updateParticipantsList([]);
        } else {
            connectToHost();
        }
    });

    peer.on('connection', (conn) => {
        console.log('Yeni bağlantı:', conn.peer);
        setupConnection(conn);
    });

    peer.on('call', async (call) => {
        if (!isHost) {
            console.log('Yayın alınıyor...');
            try {
                call.answer();
                
                call.on('stream', (remoteStream) => {
                    console.log('Uzak stream alındı');
                    if (streamVideo.srcObject !== remoteStream) {
                        streamVideo.srcObject = remoteStream;
                        streamVideo.play().catch(e => console.error('Video oynatma hatası:', e));
                    }
                });

                call.on('error', (error) => {
                    console.error('Yayın alma hatası:', error);
                    streamVideo.srcObject = null;
                });

                call.on('close', () => {
                    console.log('Yayın bağlantısı kapandı');
                    streamVideo.srcObject = null;
                });
            } catch (error) {
                console.error('Yayın cevaplama hatası:', error);
            }
        }
    });

    peer.on('error', (error) => {
        console.error('PeerJS hatası:', error);
        
        if (error.type === 'peer-unavailable') {
            alert('Oda bulunamadı veya yayıncı çevrimdışı');
            location.reload();
            return;
        }
        
        if (error.type === 'network' || error.type === 'disconnected') {
            reconnect(userId);
        }
    });

    peer.on('disconnected', () => {
        console.log('Bağlantı koptu, yeniden bağlanılıyor...');
        if (!isReconnecting) {
            reconnect(userId);
        }
    });

    window.addEventListener('beforeunload', cleanupConnection);
}

// Host'a bağlanma fonksiyonu
function connectToHost() {
    if (!peer || !roomId) {
        console.error('Bağlantı kurulamadı: peer veya roomId eksik');
        return;
    }
    
    if (hostConnection) {
        hostConnection.close();
        hostConnection = null;
    }
    
    console.log('Host\'a bağlanılıyor:', roomId);
    try {
        const conn = peer.connect(roomId, {
            reliable: true,
            serialization: 'json',
            metadata: {
                username: currentUser,
                type: 'viewer',
                timestamp: Date.now()
            }
        });

        let connectionTimeout = setTimeout(() => {
            if (!hostConnection) {
                console.log('Bağlantı zaman aşımına uğradı');
                conn.close();
                reconnect(peer.id);
            }
        }, 10000);

        conn.on('open', () => {
            clearTimeout(connectionTimeout);
            console.log('Host bağlantısı başarılı');
            hostConnection = conn;
            setupConnection(conn);
        });

        conn.on('error', (error) => {
            clearTimeout(connectionTimeout);
            console.error('Bağlantı hatası:', error);
            setTimeout(() => connectToHost(), 5000);
        });

        conn.on('close', () => {
            console.log('Host bağlantısı kapandı');
            hostConnection = null;
            reconnect(peer.id);
        });
    } catch (error) {
        console.error('Bağlantı oluşturma hatası:', error);
        setTimeout(() => connectToHost(), 5000);
    }
}

function setupConnection(conn) {
    conn.on('data', (data) => {
        handlePeerMessage(conn, data);
    });

    conn.on('open', () => {
        if (isHost) {
            connections.set(conn.peer, {
                connection: conn,
                username: conn.metadata?.username || conn.peer
            });
            // Yeni katılımcıya mevcut durumu gönder
            conn.send({
                type: 'room-info',
                roomId: roomId,
                hostUsername: currentUser,
                isStreamActive: isStreamStarted,
                participants: Array.from(connections.entries()).map(([id, data]) => ({
                    id,
                    username: data.username
                }))
            });
            broadcastParticipants();
        } else {
            hostConnection = conn;
        }
    });

    conn.on('close', () => {
        if (isHost) {
            connections.delete(conn.peer);
            broadcastParticipants();
        } else {
            alert('Yayıncı bağlantısı kesildi');
            hostConnection = null;
            location.reload();
        }
    });
}

function handlePeerMessage(conn, data) {
    switch (data.type) {
        case 'chat':
            addChatMessage(data.username, data.message);
            if (isHost) {
                // Diğer izleyicilere ilet ve displayName'i de ekle
                const forwardData = {
                    ...data,
                    displayName: connections.get(data.username)?.username || data.displayName
                };
                broadcastToOthers(conn.peer, forwardData);
            }
            break;
        case 'room-info':
            if (!isHost) {
                roomId = data.roomId;
                roomIdDisplay.textContent = roomId;
                if (data.isStreamActive) {
                    streamStatus.classList.add('d-none');
                }
                // Host kullanıcı adını sakla
                currentHost = {
                    id: roomId,
                    username: data.hostUsername
                };
                updateParticipantsList(data.participants);
            }
            break;
        case 'participants':
            if (!isHost) {
                updateParticipantsList(data.participants);
            }
            break;
        case 'stream-started':
            if (!isHost) {
                streamStatus.classList.add('d-none');
            }
            break;
        case 'stream-stopped':
            if (!isHost) {
                streamStatus.classList.remove('d-none');
                streamStatus.querySelector('.alert').textContent = 'Yayın duraklatıldı...';
                streamVideo.srcObject = null;
            }
            break;
    }
}

function broadcastToOthers(excludePeer, data) {
    connections.forEach((connData, peerId) => {
        if (peerId !== excludePeer) {
            connData.connection.send(data);
        }
    });
}

function broadcastToAll(data) {
    connections.forEach((connData, peerId) => {
        connData.connection.send(data);
    });
}

function broadcastParticipants() {
    const participants = Array.from(connections.entries()).map(([id, data]) => ({
        id,
        username: data.username
    }));
    
    broadcastToAll({
        type: 'participants',
        participants: participants
    });
    updateParticipantsList(participants);
}

function updateParticipantsList(newParticipants) {
    participants = newParticipants; // Katılımcı listesini güncelle
    participantsList.innerHTML = '';
    
    // Host ekle
    const hostItem = document.createElement('li');
    hostItem.className = 'list-group-item participant-item participant-host';
    
    if (isHost) {
        hostItem.classList.add('participant-self');
        hostItem.innerHTML = `
            <span>${currentUser} (Ben)</span>
            <span class="participant-badge">Yayıncı</span>
        `;
    } else {
        hostItem.innerHTML = `
            <span>${currentHost?.username || 'Yayıncı'}</span>
            <span class="participant-badge">Yayıncı</span>
        `;
    }
    participantsList.appendChild(hostItem);
    
    // İzleyicileri ekle
    if (isHost) {
        connections.forEach((data, peerId) => {
            const viewerItem = document.createElement('li');
            viewerItem.className = 'list-group-item participant-item';
            viewerItem.innerHTML = `
                <span>${data.username}</span>
                <span class="participant-badge">İzleyici</span>
            `;
            participantsList.appendChild(viewerItem);
        });
    } else if (participants) {
        participants.forEach(participant => {
            if (participant.id !== roomId) { // Host'u tekrar gösterme
                const viewerItem = document.createElement('li');
                viewerItem.className = 'list-group-item participant-item';
                if (participant.id === peer.id) {
                    viewerItem.classList.add('participant-self');
                    viewerItem.innerHTML = `
                        <span>${participant.username} (Ben)</span>
                        <span class="participant-badge">İzleyici</span>
                    `;
                } else {
                    viewerItem.innerHTML = `
                        <span>${participant.username}</span>
                        <span class="participant-badge">İzleyici</span>
                    `;
                }
                participantsList.appendChild(viewerItem);
            }
        });
    }
}

function addChatMessage(username, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    // Mesajı gönderen kişinin gerçek adını bul
    let displayName = username;
    if (username === peer.id) {
        displayName = currentUser;
        messageDiv.classList.add('own-message');
    } else if (isHost) {
        // Host için diğer kullanıcıların adını bul
        const connection = connections.get(username);
        if (connection) {
            displayName = connection.username;
        }
    } else {
        // İzleyici için host veya diğer izleyicilerin adını bul
        if (username === roomId) {
            displayName = currentHost?.username || 'Yayıncı';
        } else {
            // Diğer izleyicilerin adını participants listesinden bul
            const participant = participants?.find(p => p.id === username);
            if (participant) {
                displayName = participant.username;
            }
        }
        messageDiv.classList.add('other-message');
    }
    
    const time = new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
        <div class="username">${displayName}</div>
        <div class="message">${message}</div>
        <div class="time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showStreamContainer() {
    streamContainer.classList.remove('d-none');
    createRoomForm.parentElement.parentElement.classList.add('d-none');
    joinRoomForm.parentElement.parentElement.classList.add('d-none');
    
    if (isHost) {
        startStreamBtn.classList.remove('d-none');
        streamStatus.classList.remove('d-none');
        streamStatus.querySelector('.alert').textContent = 'Yayını başlatmak için "Yayını Başlat" butonuna tıklayın';
    }
}

createRoomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    currentUser = username;
    isHost = true;
    const generatedId = generateRoomId();
    console.log('Oluşturulan oda ID:', generatedId);
    initializePeer(generatedId);
});

joinRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('joinUsername').value;
    roomId = document.getElementById('roomId').value.trim();
    currentUser = username;
    isHost = false;
    
    if (!roomId) {
        alert('Lütfen oda numarasını girin');
        return;
    }
    
    console.log('Odaya katılınıyor:', roomId);
    const viewerId = generateRoomId(); // İzleyici için benzersiz ID oluştur
    initializePeer(viewerId);
    showStreamContainer();
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
        const chatData = {
            type: 'chat',
            username: peer.id,
            displayName: currentUser,
            message: message
        };
        
        if (isHost) {
            addChatMessage(peer.id, message);
            broadcastToAll(chatData);
        } else if (hostConnection) {
            addChatMessage(peer.id, message);
            hostConnection.send(chatData);
        }
        
        chatInput.value = '';
    }
});

startStreamBtn.addEventListener('click', async () => {
    try {
        if (localStream) {
            console.log('Mevcut yayın durduruluyor...');
            stopStream();
        }

        console.log('Ekran paylaşımı başlatılıyor...');
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        console.log('Ekran paylaşımı başarılı');
        streamVideo.srcObject = localStream;
        await streamVideo.play();
        streamVideo.muted = true;

        const activeConnections = new Map(connections);
        for (const [peerId, connData] of activeConnections) {
            try {
                console.log('Yayın gönderiliyor:', peerId);
                const call = peer.call(peerId, localStream);
                
                call.on('error', (error) => {
                    console.error(`Yayın gönderme hatası (${peerId}):`, error);
                    connections.delete(peerId);
                    broadcastParticipants();
                });

                call.on('close', () => {
                    console.log(`Yayın bağlantısı kapandı (${peerId})`);
                });
            } catch (error) {
                console.error(`Yayın gönderme hatası (${peerId}):`, error);
            }
        }
        
        isStreamStarted = true;
        broadcastToAll({ type: 'stream-started' });
        streamStatus.classList.add('d-none');
        console.log('Yayın başlatıldı');

        localStream.getVideoTracks()[0].onended = () => {
            console.log('Yayın durduruldu');
            stopStream();
        };

    } catch (error) {
        console.error('Ekran paylaşımı başlatılamadı:', error);
        alert('Ekran paylaşımı başlatılamadı: ' + error.message);
        stopStream();
    }
});

function stopStream() {
    isStreamStarted = false;
    broadcastToAll({ type: 'stream-stopped' });
    streamStatus.classList.remove('d-none');
    streamStatus.querySelector('.alert').textContent = 'Yayın duraklatıldı...';
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    streamVideo.srcObject = null;
} 