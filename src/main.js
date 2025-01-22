import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Vuetify CSS
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
        },
      },
    },
  },
})

// Global state management
const state = {
  user: {
    username: '',
    isHost: false,
    roomId: null
  },
  connections: new Map(),
  participants: [],
  messages: [],
  stream: null
}

const app = createApp(App)

// Global state'i provide et
app.provide('globalState', state)

// Vue Router ve Vuetify'ı ekle
app.use(router)
app.use(vuetify)

// Uygulamayı başlat
app.mount('#app') 