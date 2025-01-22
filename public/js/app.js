// DOM yüklendikten sonra çalışacak kodlar
document.addEventListener('DOMContentLoaded', () => {
    // Global değişkenler
    let peer = null;
    let localStream = null;
    let connections = new Map();
    let currentUser = {
        username: '',
        isHost: false,
        roomId: null
    };

    // DOM elementleri
    const homePage = document.getElementById('homePage');
    const streamPage = document.getElementById('streamPage');
    const loginForm = document.getElementById('loginForm');
    const hostForm = document.getElementById('hostForm');
    const viewerForm = document.getElementById('viewerForm');
    const hostRole = document.getElementById('hostRole');
    const viewerRole = document.getElementById('viewerRole');
    const submitButton = document.getElementById('submitButton');
    const submitText = document.getElementById('submitText');
    const streamVideo = document.getElementById('streamVideo');
    const streamToggle = document.getElementById('streamToggle');
    const streamStatus = document.getElementById('streamStatus');
    const participantsList = document.getElementById('participantsList');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const roomInfo = document.getElementById('roomInfo');
    const roomIdText = document.getElementById('roomIdText');
    const toast = document.getElementById('toast');
    const volumeSlider = document.getElementById('volumeSlider');

    // Video kontrolleri
    const volumeToggle = document.getElementById('volumeToggle');
    const fullscreenToggle = document.getElementById('fullscreenToggle');
    const streamStatusTitle = document.getElementById('streamStatusTitle');
    const streamStatusText = document.getElementById('streamStatusText');
    let isMuted = false;

    // Rol değişikliğini dinle
    hostRole.addEventListener('change', () => {
        hostForm.classList.remove('d-none');
        viewerForm.classList.add('d-none');
        submitText.textContent = 'Oda Oluştur';
        document.getElementById('hostPassword').required = true;
        document.getElementById('roomId').required = false;
        document.getElementById('viewerPassword').required = false;
    });

    viewerRole.addEventListener('change', () => {
        hostForm.classList.add('d-none');
        viewerForm.classList.remove('d-none');
        submitText.textContent = 'Odaya Katıl';
        document.getElementById('hostPassword').required = false;
        document.getElementById('roomId').required = true;
        document.getElementById('viewerPassword').required = true;
    });

    // Form gönderimi
    async function handleSubmit(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const isHost = hostRole.checked;
        
        if (isHost) {
            const password = document.getElementById('hostPassword').value;
            if (password.length < 6) {
                showToast('Hata', 'Şifre en az 6 karakter olmalıdır', 'error');
                return;
            }
            
            // Yeni oda oluştur
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            initializePeer(username, roomId, password, true);
        } else {
            const roomId = document.getElementById('roomId').value;
            const password = document.getElementById('viewerPassword').value;
            
            // Odaya katıl
            initializePeer(username, roomId, password, false);
        }
    }

    // PeerJS başlatma
    async function initializePeer(username, roomId, password, isHost) {
        try {
            // PeerJS bağlantısı
            const peerId = isHost ? roomId : `${roomId}-${Math.random().toString(36).substring(2, 8)}`;
            peer = new Peer(peerId, {
                host: location.hostname,
                port: location.port || (location.protocol === 'https:' ? 443 : 80),
                path: '/peerjs',
                debug: 2
            });

            // Kullanıcı bilgilerini kaydet
            currentUser = { username, isHost, roomId };

            // Sayfa görünümünü değiştir
            homePage.classList.add('d-none');
            streamPage.classList.remove('d-none');
            roomInfo.classList.remove('d-none');
            roomIdText.textContent = `Oda No: ${roomId}`;

            if (isHost) {
                streamToggle.classList.remove('d-none');
            }

            // PeerJS olaylarını dinle
            peer.on('open', (id) => {
                console.log('PeerJS bağlantısı açıldı:', id);
                
                if (!currentUser.isHost) {
                    // İzleyici olarak yayıncıya bağlan
                    connectToHost();
                } else {
                    // Yayıncı kendini listeye eklesin
                    addParticipant(id, currentUser.username, true);
                }
            });

            peer.on('connection', (conn) => {
                handleConnection(conn);
            });

            peer.on('call', (call) => {
                if (!currentUser.isHost) {
                    console.log('Yayın alınıyor...');
                    try {
                        call.answer();
                        
                        call.on('stream', (remoteStream) => {
                            console.log('Uzak stream alındı');
                            streamVideo.srcObject = remoteStream;
                            streamVideo.play().catch(e => console.error('Video oynatma hatası:', e));
                            streamStatus.style.display = 'none';
                        });

                        call.on('error', (error) => {
                            console.error('Yayın alma hatası:', error);
                            streamVideo.srcObject = null;
                            streamStatus.style.display = 'block';
                        });

                        call.on('close', () => {
                            console.log('Yayın bağlantısı kapandı');
                            streamVideo.srcObject = null;
                            streamStatus.style.display = 'block';
                        });
                    } catch (error) {
                        console.error('Yayın cevaplama hatası:', error);
                    }
                }
            });

            peer.on('error', (error) => {
                console.error('PeerJS hatası:', error);
                if (error.type === 'peer-unavailable') {
                    showToast('Hata', 'Oda bulunamadı veya yayıncı çevrimdışı', 'error');
                    setTimeout(() => location.reload(), 3000);
                } else {
                    showToast('Hata', 'Bağlantı hatası oluştu', 'error');
                }
            });

            peer.on('disconnected', () => {
                console.log('Bağlantı koptu, yeniden bağlanılıyor...');
                peer.reconnect();
            });

        } catch (error) {
            console.error('Bağlantı hatası:', error);
            showToast('Hata', 'Bağlantı kurulamadı', 'error');
        }
    }

    // Yayın başlatma/durdurma
    async function toggleStream() {
        if (!localStream) {
            try {
                localStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always',
                        width: { ideal: 1920, max: 1920 },
                        height: { ideal: 1080, max: 1080 },
                        frameRate: { ideal: 60, max: 60 }
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                streamVideo.srcObject = localStream;
                await streamVideo.play();
                streamStatus.style.display = 'none';
                streamToggle.innerHTML = '<i class="fas fa-stop me-2"></i>Yayını Durdur';

                // Yayın durduğunda
                localStream.getVideoTracks()[0].onended = () => {
                    stopStream();
                };

                // Yeni yayını tüm bağlı kullanıcılara gönder
                const activeConnections = new Map(connections);
                for (const [peerId, connData] of activeConnections) {
                    try {
                        console.log('Yayın gönderiliyor:', peerId);
                        const call = peer.call(peerId, localStream, {
                            metadata: {
                                username: currentUser.username,
                                type: 'stream'
                            }
                        });
                        
                        call.on('error', (error) => {
                            console.error(`Yayın gönderme hatası (${peerId}):`, error);
                            // Bağlantıyı yeniden dene
                            setTimeout(() => {
                                if (localStream && connections.has(peerId)) {
                                    peer.call(peerId, localStream);
                                }
                            }, 2000);
                        });
                    } catch (error) {
                        console.error(`Yayın gönderme hatası (${peerId}):`, error);
                    }
                }
                
                isStreamStarted = true;
                broadcastToAll({ type: 'stream-started' });
                console.log('Yayın başlatıldı');

            } catch (error) {
                console.error('Ekran paylaşımı başlatılamadı:', error);
                alert('Ekran paylaşımı başlatılamadı: ' + error.message);
                stopStream();
            }
        } else {
            stopStream();
        }
    }

    // Yayını durdurma
    function stopStream() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
            streamVideo.srcObject = null;
            streamStatus.style.display = 'block';
            streamToggle.innerHTML = '<i class="fas fa-play me-2"></i>Yayını Başlat';
            updateStreamStatus('Yayın durduruldu', 'Yayıncı ekran paylaşımını sonlandırdı');

            // Diğer kullanıcılara yayının durduğunu bildir
            broadcastToAll({ type: 'stream-stopped' });
            isStreamStarted = false;
        }
    }

    // Mesaj gönderme
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        const messageObj = {
            username: currentUser.username,
            text: message,
            time: new Date().toLocaleTimeString(),
            isOwn: true
        };

        // Mesajı ekranda göster
        addMessage(messageObj);

        // Mesajı diğer kullanıcılara gönder
        connections.forEach((connection) => {
            connection.connection.send({
                type: 'chat',
                message: message
            });
        });

        messageInput.value = '';
    }

    // Mesaj ekleme
    function addMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isOwn ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <div class="username">${message.username}</div>
            <div class="text">${message.text}</div>
            <div class="time">${message.time}</div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Katılımcı ekleme
    function addParticipant(userId, username, isHost) {
        // Eğer bu kullanıcı zaten listede varsa ekleme
        if (document.getElementById(`participant-${userId}`)) {
            return;
        }

        const li = document.createElement('li');
        li.className = 'list-group-item participant-item';
        li.id = `participant-${userId}`;
        li.innerHTML = `
            <i class="fas fa-user me-2"></i>
            ${username}
            ${username === currentUser.username ? 
                '<span class="badge bg-primary">Ben</span>' : 
                (isHost ? '<span class="badge bg-warning">Yayıncı</span>' : '<span class="badge bg-secondary">İzleyici</span>')}
        `;
        participantsList.appendChild(li);
    }

    // Katılımcı çıkarma
    function removeParticipant(userId) {
        const participant = document.getElementById(`participant-${userId}`);
        if (participant) {
            participant.remove();
        }
    }

    // Oda ID'sini kopyalama
    window.copyRoomId = async function() {
        try {
            await navigator.clipboard.writeText(currentUser.roomId);
            showToast('Başarılı', 'Oda numarası kopyalandı', 'success');
        } catch (error) {
            showToast('Hata', 'Kopyalama başarısız oldu', 'error');
        }
    }

    // Toast bildirimi gösterme
    function showToast(title, message, type = 'info') {
        const toastInstance = new bootstrap.Toast(toast);
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.className = `toast border-${type}`;
        toastInstance.show();
    }

    // Enter tuşu ile mesaj gönderme
    messageInput?.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // Yayın başlatma/durdurma butonu
    streamToggle?.addEventListener('click', toggleStream);

    // Form submit olayını dinle
    loginForm?.addEventListener('submit', handleSubmit);

    // Mesaj gönderme fonksiyonunu global yap
    window.sendMessage = sendMessage;

    // Ses kontrolü
    volumeSlider?.addEventListener('input', (event) => {
        if (streamVideo.srcObject) {
            const volume = event.target.value / 100;
            streamVideo.volume = volume;
            
            // Ses simgesini güncelle
            if (volume === 0) {
                volumeToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
                isMuted = true;
            } else {
                volumeToggle.innerHTML = volume < 0.5 ? 
                    '<i class="fas fa-volume-down"></i>' : 
                    '<i class="fas fa-volume-up"></i>';
                isMuted = false;
            }
        }
    });

    // Ses açma/kapama
    window.toggleVolume = function() {
        if (streamVideo.srcObject) {
            isMuted = !isMuted;
            streamVideo.muted = isMuted;
            
            if (isMuted) {
                volumeToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
                volumeSlider.value = 0;
            } else {
                const volume = volumeSlider.value / 100;
                volumeToggle.innerHTML = volume < 0.5 ? 
                    '<i class="fas fa-volume-down"></i>' : 
                    '<i class="fas fa-volume-up"></i>';
                streamVideo.volume = volume;
            }
        }
    }

    // Tam ekran
    window.toggleFullscreen = function() {
        if (!document.fullscreenElement) {
            if (streamVideo.requestFullscreen) {
                streamVideo.requestFullscreen();
            } else if (streamVideo.webkitRequestFullscreen) {
                streamVideo.webkitRequestFullscreen();
            } else if (streamVideo.msRequestFullscreen) {
                streamVideo.msRequestFullscreen();
            }
            fullscreenToggle.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    // Yayın durumu güncelleme
    function updateStreamStatus(title, text) {
        streamStatusTitle.textContent = title;
        streamStatusText.textContent = text;
    }

    // Yayın bağlantılarını yönetme
    function handleConnection(conn) {
        conn.on('open', () => {
            connections.set(conn.peer, {
                connection: conn,
                username: conn.metadata.username
            });

            // Eğer yayıncıysak, yeni bağlanan izleyiciye kendimizi tanıtalım
            if (currentUser.isHost) {
                conn.send({
                    type: 'host-info',
                    username: currentUser.username
                });
            }

            // Katılımcı listesine ekle (yayıncı değilse)
            if (conn.metadata.type !== 'host' && conn.metadata.username !== currentUser.username) {
                addParticipant(conn.peer, conn.metadata.username, conn.metadata.type === 'host');
            }

            // Mesaj gönderme/alma
            conn.on('data', (data) => {
                if (data.type === 'chat') {
                    addMessage({
                        username: conn.metadata.username,
                        text: data.message,
                        time: new Date().toLocaleTimeString(),
                        isOwn: false
                    });
                } else if (data.type === 'stream-stopped') {
                    streamStatus.style.display = 'block';
                    updateStreamStatus('Yayın durduruldu', 'Yayıncı ekran paylaşımını sonlandırdı');
                } else if (data.type === 'host-info') {
                    // Yayıncı bilgisini alınca listeye ekle
                    addParticipant(currentUser.roomId, data.username, true);
                }
            });

            conn.on('close', () => {
                connections.delete(conn.peer);
                removeParticipant(conn.peer);
                showToast('Bilgi', `${conn.metadata.username} odadan ayrıldı`, 'info');
            });
        });
    }

    // Yayıncıya bağlanma
    function connectToHost() {
        const conn = peer.connect(currentUser.roomId, {
            metadata: {
                username: currentUser.username,
                type: 'viewer'
            }
        });

        // İzleyici kendini listeye eklesin
        addParticipant(peer.id, currentUser.username, false);
        
        handleConnection(conn);
    }

    // Yayın bağlantılarını tümüne gönderme
    function broadcastToAll(data) {
        connections.forEach((connData, peerId) => {
            connData.connection.send(data);
        });
    }
}); 