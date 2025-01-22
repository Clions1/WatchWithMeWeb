<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-title>Watch With Me</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="roomId" text @click="copyRoomId">
        Oda No: {{ roomId }}
        <v-icon right>mdi-content-copy</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-main>

    <v-footer app color="primary" dark>
      <v-row justify="center" no-gutters>
        <v-col class="text-center" cols="12">
          {{ new Date().getFullYear() }} — <strong>Watch With Me</strong>
        </v-col>
      </v-row>
    </v-footer>
  </v-app>
</template>

<script>
import { inject, ref, computed } from 'vue';

export default {
  name: 'App',
  setup() {
    const globalState = inject('globalState');
    const roomId = computed(() => globalState.roomId);

    const copyRoomId = () => {
      if (roomId.value) {
        navigator.clipboard.writeText(roomId.value);
      }
    };

    return {
      roomId,
      copyRoomId
    };
  }
};
</script>

<style>
.v-application {
  font-family: 'Roboto', sans-serif;
}
</style> 