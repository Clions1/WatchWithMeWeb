const socket = io();
let localStream = null;
let peerConnection = null;
let currentUser = null;
let isHost = false;
let currentRoomId = null;
let isStreamPaused = false;
let isStreamMinimized = false;

// DOM yüklendikten sonra çalışacak kod
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM yüklendi!");
    
    // UI elements
    const homeSection = document.getElementById('home-section');
    const createStreamSection = document.getElementById('create-stream-section');
    const joinStreamSection = document.getElementById('join-stream-section');
    const contactSection = document.getElementById('contact-section');
    const streamContainer = document.getElementById('streamContainer');
    
    // Navigation elements
    const navHome = document.getElementById('navHome');
    const navCreateStream = document.getElementById('navCreateStream');
    const navJoinStream = document.getElementById('navJoinStream');
    const navContact = document.getElementById('navContact');
    
    // Home buttons
    const createRoomBtnHome = document.getElementById('createRoomBtnHome');
    const joinRoomBtnHome = document.getElementById('joinRoomBtnHome');
    
    // Back buttons
    const backToHomeFromCreate = document.getElementById('backToHomeFromCreate');
    const backToHomeFromJoin = document.getElementById('backToHomeFromJoin');
    const backToHomeFromContact = document.getElementById('backToHomeFromContact');
    
    // Forms
    const createRoomForm = document.getElementById('createRoomForm');
    const joinRoomForm = document.getElementById('joinRoomForm');
    const contactForm = document.getElementById('contactForm');
    
    // Stream elements
    const streamVideo = document.getElementById('streamVideo');
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    const pauseStream = document.getElementById('pauseStream');
    const streamPausedMessage = document.getElementById('streamPausedMessage');
    const toggleFullscreen = document.getElementById('toggleFullscreen');
    const toggleMute = document.getElementById('toggleMute');
    const volumeSlider = document.getElementById('volumeSlider');
    const leaveRoom = document.getElementById('leaveRoom');
    const copyRoomId = document.getElementById('copyRoomId');
    
    // Chat elements
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const participantsList = document.getElementById('participantsList');
    const viewersCount = document.getElementById('viewersCount');
    
    // Toast
    const toastNotification = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastTime = document.getElementById('toastTime');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    console.log("createRoomBtnHome element exists:", !!createRoomBtnHome);
    console.log("joinRoomBtnHome element exists:", !!joinRoomBtnHome);
    
    // Function to show section and hide others
    function showSection(sectionToShow) {
        console.log("Showing section:", sectionToShow ? sectionToShow.id : "undefined");
        
        // If we're in an active stream and not clicking on the stream container, minimize instead of hiding
        if (currentRoomId && streamContainer && sectionToShow !== streamContainer) {
            // Don't hide the stream container, just minimize it logically
            isStreamMinimized = true;
            streamContainer.classList.add('d-none');
            
            // Show the section we're navigating to
            if (!sectionToShow) {
                console.error("Section to show is undefined!");
                return;
            }
            
            // Hide other sections except stream container
            if (homeSection) homeSection.classList.add('d-none');
            if (createStreamSection) createStreamSection.classList.add('d-none');
            if (joinStreamSection) joinStreamSection.classList.add('d-none');
            if (contactSection) contactSection.classList.add('d-none');
            
            sectionToShow.classList.remove('d-none');
            sectionToShow.classList.add('animate__animated', 'animate__fadeIn');
            
            // Add stream return button if not already added
            addStreamReturnButton();
            
            // Update active nav
            updateActiveNav(sectionToShow);
            return;
        }
        
        // Regular section handling (when no active stream or showing stream container)
        // Hide all sections
        if (homeSection) homeSection.classList.add('d-none');
        if (createStreamSection) createStreamSection.classList.add('d-none');
        if (joinStreamSection) joinStreamSection.classList.add('d-none');
        if (contactSection) contactSection.classList.add('d-none');
        if (streamContainer) streamContainer.classList.add('d-none');
        
        // Show requested section
        if (!sectionToShow) {
            console.error("Section to show is undefined!");
            return;
        }
        
        sectionToShow.classList.remove('d-none');
        sectionToShow.classList.add('animate__animated', 'animate__fadeIn');
        
        // If showing stream container, mark as not minimized
        if (sectionToShow === streamContainer) {
            isStreamMinimized = false;
            // Remove return button if present
            removeStreamReturnButton();
        }
        
        // Update active nav
        updateActiveNav(sectionToShow);
    }
    
    function updateActiveNav(sectionToShow) {
        // Update active nav
        if (navHome) navHome.classList.remove('active');
        if (navCreateStream) navCreateStream.classList.remove('active');
        if (navJoinStream) navJoinStream.classList.remove('active');
        if (navContact) navContact.classList.remove('active');
        
        if (sectionToShow === homeSection && navHome) {
            navHome.classList.add('active');
        } else if (sectionToShow === createStreamSection && navCreateStream) {
            navCreateStream.classList.add('active');
        } else if (sectionToShow === joinStreamSection && navJoinStream) {
            navJoinStream.classList.add('active');
        } else if (sectionToShow === contactSection && navContact) {
            navContact.classList.add('active');
        }
    }
    
    // Function to add the return to stream button
    function addStreamReturnButton() {
        // Check if button already exists
        if (document.getElementById('returnToStreamBtn')) {
            return;
        }
        
        const navbar = document.querySelector('.navbar-nav');
        if (!navbar) return;
        
        const returnButton = document.createElement('li');
        returnButton.className = 'nav-item';
        returnButton.innerHTML = `
            <a class="nav-link btn btn-success text-white" href="#" id="returnToStreamBtn">
                <i class="fas fa-video me-1"></i> Yayına Dön
            </a>
        `;
        
        navbar.appendChild(returnButton);
        
        // Add event listener
        document.getElementById('returnToStreamBtn').onclick = function(e) {
            e.preventDefault();
            showSection(streamContainer);
        };
    }
    
    // Function to remove the return to stream button
    function removeStreamReturnButton() {
        const returnButton = document.getElementById('returnToStreamBtn');
        if (returnButton && returnButton.parentElement) {
            returnButton.parentElement.remove();
        }
    }
    
    // NAVIGATION BUTTONS
    // Create Room button on homepage
    if (createRoomBtnHome) {
        createRoomBtnHome.onclick = function() {
            console.log("Create Room button clicked");
            showSection(createStreamSection);
        };
    } else {
        console.error("Create Room button not found!");
    }
    
    // Join Room button on homepage
    if (joinRoomBtnHome) {
        joinRoomBtnHome.onclick = function() {
            console.log("Join Room button clicked");
            showSection(joinStreamSection);
        };
    } else {
        console.error("Join Room button not found!");
    }
    
    // Nav menu links
    if (navHome) {
        navHome.onclick = function(e) {
            e.preventDefault();
            showSection(homeSection);
        };
    }
    
    if (navCreateStream) {
        navCreateStream.onclick = function(e) {
            e.preventDefault();
            showSection(createStreamSection);
        };
    }
    
    if (navJoinStream) {
        navJoinStream.onclick = function(e) {
            e.preventDefault();
            showSection(joinStreamSection);
        };
    }
    
    if (navContact) {
        navContact.onclick = function(e) {
            e.preventDefault();
            showSection(contactSection);
        };
    }
    
    // Back buttons
    if (backToHomeFromCreate) {
        backToHomeFromCreate.onclick = function() {
            showSection(homeSection);
        };
    }
    
    if (backToHomeFromJoin) {
        backToHomeFromJoin.onclick = function() {
            showSection(homeSection);
        };
    }
    
    if (backToHomeFromContact) {
        backToHomeFromContact.onclick = function() {
            showSection(homeSection);
        };
    }
    
    // Create Room Form Submission
    if (createRoomForm) {
        createRoomForm.onsubmit = async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            currentUser = username;
            isHost = true;
            
            showLoading(true);
            
            try {
                localStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always'
                    },
                    audio: true
                });
                
                if (streamVideo) {
                    streamVideo.srcObject = localStream;
                    streamVideo.muted = true;
                    await streamVideo.play().catch(console.error);
                }
                
                socket.emit('create-room', { username, password });
                
                // Handle stream ended (user clicked "Stop sharing")
                localStream.getVideoTracks()[0].addEventListener('ended', () => {
                    console.log("User stopped sharing screen");
                    leaveCurrentRoom();
                    showToast('Bilgi', 'Ekran paylaşımı durduruldu.', 'info');
                });
                
            } catch (error) {
                showLoading(false);
                showToast('Hata', 'Ekran paylaşımı başlatılamadı: ' + error.message, 'error');
            }
        };
    }
    
    // Join Room Form Submission
    if (joinRoomForm) {
        joinRoomForm.onsubmit = function(e) {
            e.preventDefault();
            const username = document.getElementById('joinUsername').value;
            const roomId = document.getElementById('roomId').value;
            const password = document.getElementById('roomPassword').value;
            currentUser = username;
            currentRoomId = roomId;
            isHost = false;
            
            showLoading(true);
            socket.emit('join-room', { roomId, password, username });
        };
    }
    
    // İletişim formu gönderimi
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value;
            
            // Form verilerini doğrula
            if (!name || !email || !subject || !message) {
                showToast('error', 'Hata', 'Lütfen tüm alanları doldurunuz.');
                return;
            }
            
            // Sunucuya gönder
            fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, subject, message })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Formu temizle
                    contactForm.reset();
                    
                    // Başarı mesajı göster
                    showToast('success', 'Başarılı', 'Mesajınız başarıyla gönderildi. En kısa sürede size geri dönüş yapılacaktır.');
                } else {
                    showToast('error', 'Hata', data.message || 'Mesajınız gönderilirken bir hata oluştu.');
                }
            })
            .catch(error => {
                console.error('İletişim formu hatası:', error);
                showToast('error', 'Hata', 'Sunucu ile bağlantı kurulamadı. Lütfen daha sonra tekrar deneyiniz.');
            });
        });
    }

    // Footer iletişim linkine tıklama
    const footerContact = document.getElementById('footerContact');
    if (footerContact) {
        footerContact.addEventListener('click', function(e) {
            e.preventDefault();
            showSection(contactSection);
            updateNavigation(navContact);
        });
    }

    // STREAM CONTROL BUTTONS
    // Pause/Resume Stream button
    if (pauseStream) {
        pauseStream.onclick = function() {
            console.log("Pause/Resume button clicked");
            if (!isHost) {
                showToast('Uyarı', 'Sadece yayıncı ekran paylaşımını duraklatabilir.', 'warning');
                return;
            }
            
            isStreamPaused = !isStreamPaused;
            
            if (isStreamPaused) {
                // Pause stream
                pauseStream.innerHTML = '<i class="fas fa-play"></i>';
                
                if (localStream) {
                    localStream.getTracks().forEach(track => {
                        track.enabled = false;
                    });
                }
                
                // Show paused message
                if (streamPausedMessage) {
                    streamPausedMessage.classList.remove('d-none');
                }
                
                socket.emit('stream-paused', { roomId: currentRoomId });
                
            } else {
                // Resume stream
                pauseStream.innerHTML = '<i class="fas fa-pause"></i>';
                
                if (localStream) {
                    localStream.getTracks().forEach(track => {
                        track.enabled = true;
                    });
                }
                
                // Hide paused message
                if (streamPausedMessage) {
                    streamPausedMessage.classList.add('d-none');
                }
                
                socket.emit('stream-resumed', { roomId: currentRoomId });
            }
        };
    }
    
    // Toggle Fullscreen button
    if (toggleFullscreen) {
        toggleFullscreen.onclick = function() {
            console.log("Fullscreen button clicked");
            const videoContainer = document.querySelector('.video-container');
            
            if (!document.fullscreenElement) {
                if (videoContainer.requestFullscreen) {
                    videoContainer.requestFullscreen();
                } else if (videoContainer.webkitRequestFullscreen) {
                    videoContainer.webkitRequestFullscreen();
                } else if (videoContainer.msRequestFullscreen) {
                    videoContainer.msRequestFullscreen();
                }
                toggleFullscreen.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                toggleFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
            }
        };
    }
    
    // Toggle Mute button
    if (toggleMute) {
        toggleMute.onclick = function() {
            console.log("Mute button clicked");
            if (streamVideo) {
                streamVideo.muted = !streamVideo.muted;
                toggleMute.innerHTML = streamVideo.muted ? 
                    '<i class="fas fa-volume-mute"></i>' : 
                    '<i class="fas fa-volume-up"></i>';
                
                // If unmuting, set volume to slider value
                if (!streamVideo.muted && volumeSlider) {
                    streamVideo.volume = volumeSlider.value;
                }
            }
        };
    }
    
    // Volume Slider
    if (volumeSlider) {
        volumeSlider.oninput = function() {
            console.log("Volume changed:", this.value);
            if (streamVideo) {
                streamVideo.volume = this.value;
                
                // Update mute button icon based on volume
                if (toggleMute) {
                    if (parseFloat(this.value) === 0) {
                        toggleMute.innerHTML = '<i class="fas fa-volume-mute"></i>';
                        streamVideo.muted = true;
                    } else {
                        toggleMute.innerHTML = '<i class="fas fa-volume-up"></i>';
                        streamVideo.muted = false;
                    }
                }
            }
        };
    }
    
    // Leave Room button
    if (leaveRoom) {
        leaveRoom.onclick = function() {
            console.log("Leave Room button clicked");
            leaveCurrentRoom();
            showToast('Bilgi', 'Odadan ayrıldınız.', 'info');
        };
    }
    
    // Copy Room ID button
    if (copyRoomId) {
        copyRoomId.onclick = function() {
            console.log("Copy Room ID button clicked");
            const roomIdText = roomIdDisplay ? roomIdDisplay.textContent : currentRoomId;
            
            if (roomIdText) {
                navigator.clipboard.writeText(roomIdText)
                    .then(() => {
                        showToast('Başarılı', 'Oda ID\'si panoya kopyalandı!', 'success');
                    })
                    .catch(err => {
                        showToast('Hata', 'Kopyalama başarısız: ' + err, 'error');
                    });
            }
        };
    }
    
    // Chat Form Submission
    if (chatForm) {
        chatForm.onsubmit = function(e) {
            e.preventDefault();
            
            if (chatInput && chatInput.value.trim() !== '') {
                socket.emit('chat-message', { 
                    message: chatInput.value.trim(), 
                    roomId: currentRoomId 
                });
                chatInput.value = '';
            }
        };
    }
    
    // Helper functions
    function showToast(title, message, type = 'info') {
        if (!toastNotification) return;
        
        if (toastTitle) toastTitle.textContent = title;
        if (toastMessage) toastMessage.textContent = message;
        if (toastTime) toastTime.textContent = new Date().toLocaleTimeString();
        
        toastNotification.className = 'toast';
        toastNotification.classList.add(`bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'}`);
        
        const toast = new bootstrap.Toast(toastNotification);
        toast.show();
    }
    
    function showLoading(show) {
        if (!loadingSpinner) return;
        
        if (show) {
            loadingSpinner.classList.remove('d-none');
        } else {
            loadingSpinner.classList.add('d-none');
        }
    }
    
    // Add a chat message to the UI
    function addChatMessage(sender, message, timestamp) {
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        if (sender.username === currentUser) {
            messageElement.classList.add('own-message');
        } else {
            messageElement.classList.add('other-message');
        }
        
        const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="username">${sender.username}</div>
            <div class="message">${message}</div>
            <div class="time">${time}</div>
        `;
        
        // Add the message
        chatMessages.appendChild(messageElement);
        
        // Automatically scroll to the bottom when new message arrives
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Socket events
    socket.on('room-created', ({ roomId }) => {
        currentRoomId = roomId;
        isHost = true;
        if (roomIdDisplay) roomIdDisplay.textContent = roomId;
        showSection(streamContainer);
        showLoading(false);
        showToast('Başarılı', 'Oda oluşturuldu! Oda Numarası: ' + roomId, 'success');
        
        // Show pause button for host only
        if (pauseStream) {
            pauseStream.style.display = 'inline-block';
        }
    });
    
    socket.on('room-joined', ({ messages }) => {
        isHost = false;
        showSection(streamContainer);
        showLoading(false);
        showToast('Başarılı', 'Odaya başarıyla katıldınız!', 'success');
        
        // Hide pause button for viewers
        if (pauseStream) {
            pauseStream.style.display = 'none';
        }
        
        // Load chat history if available
        if (messages && Array.isArray(messages)) {
            messages.forEach(msg => {
                addChatMessage(msg.sender, msg.message, msg.timestamp);
            });
        }
        
        // Setup peer connection for receiving the stream
        setupPeerConnection();
    });
    
    socket.on('viewer-connected', async ({ viewerId }) => {
        try {
            if (!peerConnection) {
                setupPeerConnection();
            }
            
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            socket.emit('offer', { offer: peerConnection.localDescription, viewerId });
            
            if (isStreamPaused) {
                socket.emit('stream-paused', { roomId: currentRoomId, targetViewerId: viewerId });
            }
        } catch (error) {
            console.error('Error creating offer:', error);
            showToast('Hata', 'Bağlantı kurulurken bir hata oluştu', 'error');
        }
    });
    
    socket.on('offer', async ({ offer, hostId }) => {
        try {
            if (!peerConnection) {
                setupPeerConnection();
            }
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('answer', { answer: peerConnection.localDescription, hostId });
        } catch (error) {
            console.error('Error creating answer:', error);
            showToast('Hata', 'Bağlantı kurulurken bir hata oluştu', 'error');
        }
    });
    
    socket.on('answer', async ({ answer }) => {
        try {
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            console.error('Error setting remote description:', error);
        }
    });
    
    socket.on('ice-candidate', async ({ candidate, from }) => {
        try {
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    });
    
    socket.on('stream-paused', () => {
        if (streamPausedMessage) {
            streamPausedMessage.classList.remove('d-none');
        }
        showToast('Bilgi', 'Yayıncı ekran paylaşımını duraklatmış durumda.', 'info');
    });
    
    socket.on('stream-resumed', () => {
        if (streamPausedMessage) {
            streamPausedMessage.classList.add('d-none');
        }
        showToast('Bilgi', 'Yayıncı ekran paylaşımını devam ettirdi.', 'info');
    });
    
    socket.on('new-message', ({ sender, message, timestamp }) => {
        addChatMessage(sender, message, timestamp);
    });
    
    socket.on('update-participants', ({ host, viewers }) => {
        if (!participantsList) return;
        
        participantsList.innerHTML = '';
        
        // Add host
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
        
        // Add viewers
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
        
        // Update viewers count
        if (viewersCount) {
            viewersCount.textContent = viewers.length;
        }
        
        // Auto-scroll the participants list to the bottom if list exceeds viewable area
        // Check if scrollHeight is greater than clientHeight (content overflows)
        if (participantsList.scrollHeight > participantsList.clientHeight) {
            participantsList.scrollTop = participantsList.scrollHeight;
        }
    });
    
    socket.on('user-disconnected', ({ username }) => {
        showToast('Bilgi', `${username} odadan ayrıldı.`, 'info');
    });
    
    socket.on('host-disconnected', ({ message }) => {
        showToast('Uyarı', message, 'warning');
        // Host disconnected, return to home page and reset connection
        leaveCurrentRoom();
    });
    
    socket.on('error', ({ message }) => {
        showLoading(false);
        showToast('Hata', message, 'error');
    });
    
    // Handle fullscreenchange event
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement && toggleFullscreen) {
            toggleFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });
    
    // WebRTC Configuration
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    function setupPeerConnection() {
        // Close existing connection if any
        if (peerConnection) {
            peerConnection.close();
        }
        
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local tracks to the connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        
        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: isHost ? 'viewer' : 'host'
                });
            }
        };
        
        // Handle incoming tracks (for viewers)
        if (!isHost) {
            peerConnection.ontrack = event => {
                console.log('Received remote track', event);
                const remoteStream = event.streams[0];
                const streamVideo = document.getElementById('streamVideo');
                if (streamVideo) {
                    // Set the stream as video source
                    streamVideo.srcObject = remoteStream;
                    
                    // Set initial volume based on slider if present
                    const volumeSlider = document.getElementById('volumeSlider');
                    if (volumeSlider) {
                        streamVideo.volume = volumeSlider.value;
                    }
                    
                    // Add loadedmetadata event listener to avoid AbortError
                    streamVideo.onloadedmetadata = () => {
                        console.log('Video metadata loaded, attempting to play');
                        
                        // Try to play only when we have metadata and the video is ready
                        const playPromise = streamVideo.play();
                        
                        if (playPromise !== undefined) {
                            playPromise
                                .then(() => {
                                    console.log('Video playing successfully');
                                    // Hide any loading indicators if needed
                                    if (streamPausedMessage) {
                                        streamPausedMessage.classList.add('d-none');
                                    }
                                })
                                .catch(error => {
                                    console.error('Error playing video:', error);
                                    // Show a user-friendly error message
                                    showToast('Video Hatası', 'Video oynatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.', 'error');
                                    
                                    // Add a manual play button if autoplay fails
                                    if (streamVideo.parentElement) {
                                        const playButton = document.createElement('button');
                                        playButton.className = 'btn btn-primary manual-play-btn';
                                        playButton.innerHTML = '<i class="fas fa-play"></i> Videoyu Oynat';
                                        playButton.style.position = 'absolute';
                                        playButton.style.top = '50%';
                                        playButton.style.left = '50%';
                                        playButton.style.transform = 'translate(-50%, -50%)';
                                        playButton.style.zIndex = '10';
                                        
                                        playButton.onclick = () => {
                                            streamVideo.play();
                                            playButton.remove();
                                        };
                                        
                                        streamVideo.parentElement.appendChild(playButton);
                                    }
                                });
                        }
                    };
                    
                    // Also handle errors
                    streamVideo.onerror = (e) => {
                        console.error('Video element error:', e);
                        showToast('Bağlantı Hatası', 'Video yüklenirken bir hata oluştu.', 'error');
                    };
                }
            };
        }
        
        // Connection state changes
        peerConnection.onconnectionstatechange = event => {
            console.log("Connection state:", peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' || 
                peerConnection.connectionState === 'failed' ||
                peerConnection.connectionState === 'closed') {
                console.log("WebRTC connection closed/failed");
            }
        };
    }

    function leaveCurrentRoom() {
        if (currentRoomId) {
            socket.emit('leave-room', { roomId: currentRoomId, username: currentUser });
        }
        
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        const streamVideo = document.getElementById('streamVideo');
        if (streamVideo) {
            streamVideo.srcObject = null;
        }
        
        const homeSection = document.getElementById('home-section');
        const streamContainer = document.getElementById('streamContainer');
        const streamPausedMessage = document.getElementById('streamPausedMessage');
        
        if (homeSection) homeSection.classList.remove('d-none');
        if (streamContainer) streamContainer.classList.add('d-none');
        if (streamPausedMessage) streamPausedMessage.classList.add('d-none');
        
        currentRoomId = null;
        isHost = false;
        isStreamPaused = false;
        isStreamMinimized = false;
        
        // Remove return button if it exists
        removeStreamReturnButton();
    }

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (currentRoomId) {
            socket.emit('leave-room', { roomId: currentRoomId, username: currentUser });
        }
    });
    
    // Debug info
    console.log("DOMContentLoaded completed, buttons should be working");
});