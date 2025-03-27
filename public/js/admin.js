document.addEventListener('DOMContentLoaded', function() {
    // DOM Elementleri
    const loginPanel = document.getElementById('loginPanel');
    const adminPanel = document.getElementById('adminPanel');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const messagesList = document.getElementById('messagesList');
    const noMessagesPlaceholder = document.getElementById('noMessagesPlaceholder');
    const unreadCount = document.getElementById('unreadCount');
    const refreshMessages = document.getElementById('refreshMessages');
    const adminMenuItems = document.querySelectorAll('.admin-menu-item');
    const adminContentPanels = document.querySelectorAll('.admin-content-panel');
    
    // Modal elementleri
    const messageDetailModal = new bootstrap.Modal(document.getElementById('messageDetailModal'));
    const messageSubject = document.getElementById('messageSubject');
    const messageSender = document.getElementById('messageSender');
    const messageEmail = document.getElementById('messageEmail');
    const messageDate = document.getElementById('messageDate');
    const messageStatus = document.getElementById('messageStatus');
    const messageContent = document.getElementById('messageContent');
    const toggleReadStatus = document.getElementById('toggleReadStatus');
    const deleteMessage = document.getElementById('deleteMessage');
    
    // Sistem İstatistikleri
    const activeRoomsCount = document.getElementById('activeRoomsCount');
    const totalUsersCount = document.getElementById('totalUsersCount');
    const totalMessagesCount = document.getElementById('totalMessagesCount');
    const serverUptime = document.getElementById('serverUptime');
    
    // Toast container
    const toastContainer = document.querySelector('.toast-container');
    
    // Giriş durumunu kontrol et
    checkLoginStatus();
    
    // Şifre görünürlük toggle
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Giriş formunu dinle
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault(); // Form submission'ı engelle
        
        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value.trim();
        
        if (username && password) {
            login(username, password);
        } else {
            showToast('Kullanıcı adı ve şifre zorunludur', 'warning');
        }
    });
    
    // Çıkış butonu
    logoutBtn.addEventListener('click', function() {
        logout();
    });
    
    // Menü elementleri
    adminMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetPanel = this.getAttribute('data-panel');
            
            // Aktif menü öğesini değiştir
            adminMenuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // İlgili paneli göster
            adminContentPanels.forEach(panel => {
                if (panel.id === targetPanel + 'Panel') {
                    panel.classList.remove('d-none');
                } else {
                    panel.classList.add('d-none');
                }
            });
            
            // Eğer sistem istatistikleri seçildiyse güncelle
            if (targetPanel === 'systemStats') {
                fetchSystemStats();
            }
        });
    });
    
    // Mesajları yenile butonu
    refreshMessages.addEventListener('click', function() {
        fetchMessages();
    });
    
    // Admin giriş fonksiyonu
    function login(username, password) {
        fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Giriş başarılı
                localStorage.setItem('adminLoggedIn', 'true');
                
                // Admin paneline geçiş
                loginPanel.classList.remove('animate__fadeIn');
                loginPanel.classList.add('animate__fadeOut');
                
                setTimeout(() => {
                    loginPanel.classList.add('d-none');
                    adminPanel.classList.remove('d-none');
                    adminPanel.classList.add('animate__fadeIn');
                    
                    // Mesajları yükle
                    fetchMessages();
                    // Sistem istatistiklerini yükle
                    fetchSystemStats();
                }, 500);
                
            } else {
                // Giriş başarısız
                showToast('Kullanıcı adı veya şifre yanlış', 'danger');
                
                // Şifre alanını temizle
                document.getElementById('adminPassword').value = '';
                document.getElementById('adminPassword').focus();
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showToast('Bağlantı hatası: Sunucuya erişilemiyor', 'danger');
        });
    }
    
    // Çıkış fonksiyonu
    function logout() {
        localStorage.removeItem('adminLoggedIn');
        
        // Giriş ekranına geçiş
        adminPanel.classList.remove('animate__fadeIn');
        adminPanel.classList.add('animate__fadeOut');
        
        setTimeout(() => {
            adminPanel.classList.add('d-none');
            loginPanel.classList.remove('d-none');
            loginPanel.classList.add('animate__fadeIn');
            loginPanel.classList.remove('animate__fadeOut');
            
            // Giriş formunu temizle
            document.getElementById('adminUsername').value = '';
            document.getElementById('adminPassword').value = '';
        }, 500);
    }
    
    // Giriş durumunu kontrol et
    function checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        
        if (isLoggedIn) {
            loginPanel.classList.add('d-none');
            adminPanel.classList.remove('d-none');
            
            // Mesajları yükle
            fetchMessages();
            // Sistem istatistiklerini yükle
            fetchSystemStats();
        }
    }
    
    // Mesajları getir
    function fetchMessages() {
        fetch('/api/admin/messages')
            .then(response => response.json())
            .then(messages => {
                renderMessages(messages);
            })
            .catch(error => {
                console.error('Error fetching messages:', error);
                showToast('Mesajlar yüklenirken bir hata oluştu', 'error');
            });
    }
    
    // Sistem istatistiklerini getir
    function fetchSystemStats() {
        fetch('/api/admin/stats')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const stats = data.stats;
                    
                    // İstatistikleri güncelle
                    activeRoomsCount.textContent = stats.activeRooms;
                    totalUsersCount.textContent = stats.totalUsers;
                    totalMessagesCount.textContent = stats.totalMessages + stats.contactMessagesCount;
                    
                    // Sunucu çalışma süresi
                    serverUptime.textContent = `${stats.uptime} saat`;
                }
            })
            .catch(error => {
                console.error('Error fetching system stats:', error);
                // Hata durumunda örnek veriler göster
                activeRoomsCount.textContent = '0';
                totalUsersCount.textContent = '0';
                totalMessagesCount.textContent = '0';
                serverUptime.textContent = '0 saat';
            });
    }
    
    // Mesajları ekrana render et
    function renderMessages(messages) {
        messagesList.innerHTML = '';
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<tr><td colspan="4" class="text-center">Henüz mesaj yok</td></tr>';
            noMessagesPlaceholder.classList.remove('d-none');
            return;
        }
        
        noMessagesPlaceholder.classList.add('d-none');
        
        // Okunmamış mesaj sayısını hesapla
        const unreadMessages = messages.filter(message => !message.read);
        unreadCount.textContent = unreadMessages.length;
        
        messages.forEach(message => {
            const row = document.createElement('tr');
            
            // Okunmamış mesajları vurgula
            if (!message.read) {
                row.classList.add('table-primary', 'fw-bold');
            }
            
            const date = new Date(message.date);
            const formattedDate = formatDate(date);
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-${message.read ? 'secondary' : 'primary'} rounded-circle me-2 d-flex align-items-center justify-content-center">
                            <i class="fas fa-${message.read ? 'envelope-open' : 'envelope'}"></i>
                        </div>
                        ${message.name}
                    </div>
                </td>
                <td>${message.subject}</td>
                <td><small>${formattedDate}</small></td>
                <td>
                    <button class="btn btn-sm btn-primary view-message" data-id="${message._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            messagesList.appendChild(row);
        });
        
        // Mesaj görüntüleme butonlarına tıklama olayı ekle
        document.querySelectorAll('.view-message').forEach(button => {
            button.addEventListener('click', () => {
                const messageId = button.getAttribute('data-id');
                const message = messages.find(msg => msg._id === messageId);
                
                if (message) {
                    // Modal içeriğini güncelle
                    document.getElementById('messageSubject').textContent = message.subject;
                    document.getElementById('messageSender').textContent = message.name;
                    document.getElementById('messageEmail').textContent = message.email;
                    document.getElementById('messageDate').textContent = formatDate(new Date(message.date));
                    document.getElementById('messageStatus').textContent = message.read ? 'Okundu' : 'Okunmadı';
                    document.getElementById('messageStatus').className = message.read ? 'badge bg-success' : 'badge bg-warning';
                    document.getElementById('messageContent').textContent = message.message;
                    
                    // Buton metnini güncelle
                    const toggleReadBtn = document.getElementById('toggleReadStatus');
                    toggleReadBtn.innerHTML = message.read ? 
                        '<i class="fas fa-envelope me-2"></i>Okunmadı İşaretle' : 
                        '<i class="fas fa-envelope-open me-2"></i>Okundu İşaretle';
                        
                    // Butonlara mesaj ID'sini ekle
                    toggleReadBtn.setAttribute('data-id', message._id);
                    document.getElementById('deleteMessage').setAttribute('data-id', message._id);
                    
                    // Modalı göster
                    messageDetailModal.show();
                    
                    // Mesaj okunmamışsa, otomatik olarak okundu olarak işaretle
                    if (!message.read) {
                        toggleReadStatus(message._id, true);
                    }
                }
            });
        });
    }
    
    // Okundu/Okunmadı işaretle
    function toggleReadStatus(messageId, isRead) {
        fetch(`/api/admin/messages/${messageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ read: isRead })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mesajları yeniden yükle
                fetchMessages();
                
                // Modal içeriğini güncelle
                if (messageDetailModal._element.classList.contains('show')) {
                    document.getElementById('messageStatus').textContent = isRead ? 'Okundu' : 'Okunmadı';
                    document.getElementById('messageStatus').className = isRead ? 'badge bg-success' : 'badge bg-warning';
                    
                    // Buton metnini güncelle
                    const toggleReadBtn = document.getElementById('toggleReadStatus');
                    toggleReadBtn.innerHTML = isRead ? 
                        '<i class="fas fa-envelope me-2"></i>Okunmadı İşaretle' : 
                        '<i class="fas fa-envelope-open me-2"></i>Okundu İşaretle';
                }
                
                showToast(isRead ? 'Mesaj okundu olarak işaretlendi' : 'Mesaj okunmadı olarak işaretlendi', 'success');
            } else {
                showToast('Bir hata oluştu: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Bir hata oluştu', 'danger');
        });
    }
    
    // Okundu/Okunmadı işaretle butonuna tıklama
    document.getElementById('toggleReadStatus').addEventListener('click', function() {
        const messageId = this.getAttribute('data-id');
        const currentStatus = document.getElementById('messageStatus').textContent === 'Okundu';
        toggleReadStatus(messageId, !currentStatus);
    });
    
    // Mesajı sil
    document.getElementById('deleteMessage').addEventListener('click', async function() {
        const messageId = this.getAttribute('data-id');
        
        if (confirm('Bu mesajı silmek istediğinizden emin misiniz?')) {
            try {
                const response = await fetch(`/api/admin/messages/${messageId}`, {
                    method: 'DELETE'
                });
                
                const data = await response.json();
                
                if (data.success) {
                    messageDetailModal.hide();
                    fetchMessages();
                    showToast('Mesaj silindi', 'success');
                } else {
                    showToast('Bir hata oluştu: ' + data.message, 'danger');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Bir hata oluştu', 'danger');
            }
        }
    })

    // Toast bildirimi göster
    function showToast(message, type = 'info') {
        // type değerini düzelt, error yerine danger kullan (Bootstrap renk şeması)
        if (type === 'error') type = 'danger';
        
        const toastElement = document.createElement('div');
        toastElement.className = `toast align-items-center text-white bg-${type} border-0`;
        toastElement.setAttribute('role', 'alert');
        toastElement.setAttribute('aria-live', 'assertive');
        toastElement.setAttribute('aria-atomic', 'true');
        
        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Kapat"></button>
            </div>
        `;
        
        // Toast container oluştur veya mevcut olanı kullan
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toastElement);
        
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 4000
        });
        
        toast.show();
        
        // 4.5 saniye sonra DOM'dan kaldır
        setTimeout(() => {
            toastElement.remove();
        }, 4500);
    }

    // Tarih formatını düzenle
    function formatDate(date) {
        return `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}`;
    }
});
