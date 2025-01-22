<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="6">
        <v-card class="mx-auto" elevation="8">
          <v-tabs v-model="activeTab" grow>
            <v-tab value="create">Yayın Oluştur</v-tab>
            <v-tab value="join">Yayına Katıl</v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="activeTab">
              <!-- Yayın Oluştur -->
              <v-window-item value="create">
                <v-form @submit.prevent="createRoom" ref="createForm">
                  <v-text-field
                    v-model="createUsername"
                    label="Kullanıcı Adı"
                    :rules="[rules.required]"
                    prepend-icon="mdi-account"
                    required
                  ></v-text-field>

                  <v-btn
                    type="submit"
                    color="primary"
                    block
                    :loading="loading"
                    :disabled="loading"
                  >
                    Oda Oluştur
                    <v-icon right>mdi-plus-circle</v-icon>
                  </v-btn>
                </v-form>
              </v-window-item>

              <!-- Yayına Katıl -->
              <v-window-item value="join">
                <v-form @submit.prevent="joinRoom" ref="joinForm">
                  <v-text-field
                    v-model="joinUsername"
                    label="Kullanıcı Adı"
                    :rules="[rules.required]"
                    prepend-icon="mdi-account"
                    required
                  ></v-text-field>

                  <v-text-field
                    v-model="roomId"
                    label="Oda Numarası"
                    :rules="[rules.required]"
                    prepend-icon="mdi-door"
                    required
                  ></v-text-field>

                  <v-btn
                    type="submit"
                    color="success"
                    block
                    :loading="loading"
                    :disabled="loading"
                  >
                    Odaya Katıl
                    <v-icon right>mdi-login</v-icon>
                  </v-btn>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>
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
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'Home',
  setup() {
    const router = useRouter();
    const globalState = inject('globalState');
    
    const activeTab = ref('create');
    const createUsername = ref('');
    const joinUsername = ref('');
    const roomId = ref('');
    const loading = ref(false);
    const showError = ref(false);
    const errorMessage = ref('');
    const createForm = ref(null);
    const joinForm = ref(null);

    const rules = {
      required: v => !!v || 'Bu alan zorunludur'
    };

    const showErrorMessage = (message) => {
      errorMessage.value = message;
      showError.value = true;
    };

    const createRoom = async () => {
      if (!createForm.value.validate()) return;
      
      loading.value = true;
      try {
        globalState.currentUser = createUsername.value;
        globalState.isHost = true;
        router.push({ name: 'stream' });
      } catch (error) {
        showErrorMessage('Oda oluşturulurken bir hata oluştu');
      } finally {
        loading.value = false;
      }
    };

    const joinRoom = async () => {
      if (!joinForm.value.validate()) return;
      
      loading.value = true;
      try {
        globalState.currentUser = joinUsername.value;
        globalState.isHost = false;
        router.push({ 
          name: 'stream',
          params: { roomId: roomId.value }
        });
      } catch (error) {
        showErrorMessage('Odaya katılırken bir hata oluştu');
      } finally {
        loading.value = false;
      }
    };

    return {
      activeTab,
      createUsername,
      joinUsername,
      roomId,
      loading,
      showError,
      errorMessage,
      createForm,
      joinForm,
      rules,
      createRoom,
      joinRoom
    };
  }
};
</script>

<style scoped>
.v-card {
  margin-top: 2rem;
}
</style> 