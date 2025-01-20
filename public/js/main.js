const socket = io();
let localStream = null;
let peerConnection = null;
let currentUser = null;

const createRoomForm = document.getElementById('createRoomForm');
const joinRoomForm = document.getElementById('joinRoomForm');
const streamContainer = document.getElementById('streamContainer');
const streamVideo = document.getElementById('streamVideo');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const participantsList = document.getElementById('participantsList');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

createRoomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    currentUser = username;

    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });

        streamVideo.srcObject = localStream;
        await streamVideo.play().catch(console.error);
        
        // Ses izleme
        localStream.getAudioTracks().forEach(track => {
            track.enabled = true;
        });

        socket.emit('create-room', { username, password });
    } catch (error) {
        alert('Ekran paylaşımı başlatılamadı: ' + error.message);
    }
});

joinRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('joinUsername').value;
    const roomId = document.getElementById('roomId').value;
    const password = document.getElementById('roomPassword').value;
    currentUser = username;
    
    socket.emit('join-room', { roomId, password, username });
    setupPeerConnection();
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat-message', { message });
        chatInput.value = '';
    }
});

socket.on('room-created', ({ roomId }) => {
    roomIdDisplay.textContent = roomId;
    streamContainer.classList.remove('d-none');
    createRoomForm.parentElement.parentElement.classList.add('d-none');
    joinRoomForm.parentElement.parentElement.classList.add('d-none');
    
    setupPeerConnection();
});

socket.on('viewer-connected', async () => {
    try {
        if (!peerConnection) {
            setupPeerConnection();
        }
        
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { offer: peerConnection.localDescription });
    } catch (error) {
        console.error('Offer oluşturma hatası:', error);
    }
});

socket.on('offer', async ({ offer }) => {
    try {
        if (!peerConnection) {
            setupPeerConnection();
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', { answer: peerConnection.localDescription });
    } catch (error) {
        console.error('Answer oluşturma hatası:', error);
    }
});

socket.on('answer', async ({ answer }) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error('Answer ayarlama hatası:', error);
    }
});

socket.on('ice-candidate', async ({ candidate }) => {
    try {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error('ICE candidate ekleme hatası:', error);
    }
});

socket.on('update-participants', ({ host, viewers }) => {
    participantsList.innerHTML = '';
    
    // Host ekle
    const hostItem = document.createElement('li');
    hostItem.className = 'list-group-item participant-item participant-host';
    if (host.username === currentUser) {
        hostItem.classList.add('participant-self');
    }
    hostItem.innerHTML = `
        <span>${host.username}</span>
        <span class="participant-badge">
            ${host.username === currentUser ? 'Ben (Yayıncı)' : 'Yayıncı'}
        </span>
    `;
    participantsList.appendChild(hostItem);
    
    // İzleyicileri ekle
    viewers.forEach(viewer => {
        const viewerItem = document.createElement('li');
        viewerItem.className = 'list-group-item participant-item';
        if (viewer.username === currentUser) {
            viewerItem.classList.add('participant-self');
        }
        viewerItem.innerHTML = `
            <span>${viewer.username}</span>
            ${viewer.username === currentUser ? '<span class="participant-badge">Ben</span>' : ''}
        `;
        participantsList.appendChild(viewerItem);
    });
});

socket.on('new-message', ({ sender, message, timestamp }) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    if (sender.username === currentUser) {
        messageDiv.classList.add('own-message');
    } else {
        messageDiv.classList.add('other-message');
    }
    
    const time = new Date(timestamp).toLocaleTimeString();
    messageDiv.innerHTML = `
        <div class="username">${sender.username}</div>
        <div class="message">${message}</div>
        <div class="time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('room-joined', ({ messages }) => {
    streamContainer.classList.remove('d-none');
    createRoomForm.parentElement.parentElement.classList.add('d-none');
    joinRoomForm.parentElement.parentElement.classList.add('d-none');
    
    // Eski mesajları yükle
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        
        if (msg.sender.username === currentUser) {
            messageDiv.classList.add('own-message');
        } else {
            messageDiv.classList.add('other-message');
        }
        
        const time = new Date(msg.timestamp).toLocaleTimeString();
        messageDiv.innerHTML = `
            <div class="username">${msg.sender.username}</div>
            <div class="message">${msg.message}</div>
            <div class="time">${time}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function setupPeerConnection() {
    if (peerConnection) {
        peerConnection.close();
    }
    
    peerConnection = new RTCPeerConnection(configuration);
    
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
    
    peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            streamVideo.srcObject = event.streams[0];
            streamVideo.play().catch(console.error);
        }
    };
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate });
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE bağlantı durumu:', peerConnection.iceConnectionState);
    };
}

socket.on('error', ({ message }) => {
    alert(message);
}); 