<template>
  <v-container fluid class="fill-height">
    <v-row>
      <!-- Video Alanı -->
      <v-col cols="12" md="8">
        <v-card height="100%">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Canlı Yayın</span>
            <v-btn
              v-if="isHost"
              color="primary"
              @click="toggleStream"
              :loading="loading"
            >
              {{ isStreamStarted ? 'Yayını Durdur' : 'Yayını Başlat' }}
              <v-icon right>{{ isStreamStarted ? 'mdi-stop' : 'mdi-play' }}</v-icon>
            </v-btn>
          </v-card-title>

          <v-card-text class="position-relative" style="height: calc(100% - 64px)">
            <!-- Yayın Durumu -->
            <v-overlay
              v-model="showStreamStatus"
              class="align-center justify-center"
            >
              <v-alert
                type="warning"
                variant="tonal"
                class="ma-2"
              >
                {{ streamStatusMessage }}
              </v-alert>
            </v-overlay>

            <!-- Video Elementi -->
            <video
              ref="streamVideo"
              class="w-100 h-100"
              style="object-fit: contain;"
              controls
              playsinline
            >
              Tarayıcınız video elementini desteklemiyor.
            </video>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Sağ Panel -->
      <v-col cols="12" md="4">
        <!-- Katılımcılar Listesi -->
        <v-card class="mb-4">
          <v-card-title>
            <v-icon left>mdi-account-group</v-icon>
            Katılımcılar
          </v-card-title>
          <v-list>
            <v-list-item
              v-for="participant in participants"
              :key="participant.id"
              :prepend-icon="participant.isHost ? 'mdi-crown' : 'mdi-account'"
              :title="participant.username"
              :subtitle="participant.isHost ? 'Yayıncı' : 'İzleyici'"
            >
              <template v-slot:append>
                <v-chip
                  v-if="participant.id === currentUser"
                  color="primary"
                  size="small"
                >
                  Ben
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Chat -->
        <v-card height="calc(100% - 300px)">
          <v-card-title>
            <v-icon left>mdi-chat</v-icon>
            Sohbet
          </v-card-title>
          
          <v-card-text class="chat-container">
            <div class="chat-messages" ref="chatMessages">
              <div
                v-for="(message, index) in chatMessages"
                :key="index"
                :class="['message-bubble', message.isOwn ? 'own-message' : '']"
              >
                <div class="message-header">
                  <strong>{{ message.username }}</strong>
                  <small>{{ message.time }}</small>
                </div>
                <div class="message-content">{{ message.message }}</div>
              </div>
            </div>
          </v-card-text>

          <v-card-actions>
            <v-form @submit.prevent="sendMessage" class="d-flex w-100">
              <v-text-field
                v-model="newMessage"
                placeholder="Mesajınız..."
                hide-details
                density="compact"
                @keyup.enter="sendMessage"
              ></v-text-field>
              <v-btn
                color="primary"
                icon
                class="ml-2"
                type="submit"
                :disabled="!newMessage.trim()"
              >
                <v-icon>mdi-send</v-icon>
              </v-btn>
            </v-form>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Hata Snackbar -->
    <v-snackbar
      v-model="showError"
      color="error"
      timeout="3000"
    >
      {{ errorMessage }}
      <template v-slot:actions>
        <v-btn
          color="white"
          variant="text"
          @click="showError = false"
        >
          Kapat
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, inject, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  name: 'Stream',
  props: {
    roomId: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const globalState = inject('globalState');
    
    // Refs
    const streamVideo = ref(null);
    const chatMessages = ref(null);
    const newMessage = ref('');
    const loading = ref(false);
    const showError = ref(false);
    const errorMessage = ref('');
    const participants = ref([]);
    const messages = ref([]);

    // Computed
    const isHost = computed(() => globalState.isHost);
    const currentUser = computed(() => globalState.currentUser);
    const isStreamStarted = computed(() => globalState.isStreamStarted);
    const showStreamStatus = computed(() => !isHost.value && !isStreamStarted.value);
    const streamStatusMessage = computed(() => 
      isStreamStarted.value ? '' : 'Yayıncının yayını başlatması bekleniyor...'
    );

    // Methods
    const showErrorMessage = (message) => {
      errorMessage.value = message;
      showError.value = true;
    };

    const scrollToBottom = () => {
      if (chatMessages.value) {
        chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
      }
    };

    const toggleStream = async () => {
      if (isStreamStarted.value) {
        stopStream();
      } else {
        startStream();
      }
    };

    const startStream = async () => {
      loading.value = true;
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
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
        
        globalState.localStream = stream;
        streamVideo.value.srcObject = stream;
        globalState.isStreamStarted = true;
        
        // Yayını izleyicilere gönder
        // Bu kısım peer.js entegrasyonunda yapılacak
        
      } catch (error) {
        showErrorMessage('Ekran paylaşımı başlatılamadı: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const stopStream = () => {
      if (globalState.localStream) {
        globalState.localStream.getTracks().forEach(track => track.stop());
        globalState.localStream = null;
      }
      streamVideo.value.srcObject = null;
      globalState.isStreamStarted = false;
    };

    const sendMessage = () => {
      if (!newMessage.value.trim()) return;
      
      const message = {
        username: currentUser.value,
        message: newMessage.value,
        time: new Date().toLocaleTimeString(),
        isOwn: true
      };
      
      messages.value.push(message);
      newMessage.value = '';
      scrollToBottom();
      
      // Mesajı diğer kullanıcılara gönder
      // Bu kısım peer.js entegrasyonunda yapılacak
    };

    // Lifecycle hooks
    onMounted(() => {
      if (!currentUser.value) {
        router.push('/');
        return;
      }

      if (!isHost.value && !props.roomId) {
        router.push('/');
        return;
      }

      // PeerJS bağlantısını başlat
      // Bu kısım peer.js entegrasyonunda yapılacak
    });

    onUnmounted(() => {
      stopStream();
    });

    // Watch
    watch(messages, () => {
      scrollToBottom();
    }, { deep: true });

    return {
      streamVideo,
      chatMessages,
      newMessage,
      loading,
      showError,
      errorMessage,
      participants,
      messages,
      isHost,
      currentUser,
      isStreamStarted,
      showStreamStatus,
      streamStatusMessage,
      toggleStream,
      sendMessage
    };
  }
};
</script>

<style scoped>
.chat-container {
  height: calc(100% - 120px);
  position: relative;
  padding: 0;
}

.chat-messages {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

.message-bubble {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  max-width: 80%;
}

.message-bubble.own-message {
  margin-left: auto;
  background-color: var(--v-primary-base);
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.message-content {
  word-break: break-word;
}

video {
  background-color: #000;
}
</style> 