import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// ✅ Import MDI FONT (WAJIB)
import '@mdi/font/css/materialdesignicons.css'

// Import global styles
import './style.css'

// Import constants
import { DEFAULT_THEME } from './utils/const'

// Vuetify styles (REQUIRED)
// import 'vuetify/styles'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi', // ✅ cukup ini saja
  },
  theme: {
    defaultTheme: localStorage.getItem('theme') || DEFAULT_THEME,
    themes: {
      light: {
        colors: {
          background: '#adb6c1',
          surface: '#FFFFFF',
          primary: '#2563EB',
          secondary: '#3B82F6',
          error: '#EF4444',
          success: '#22C55E',
        },
      },
      dark: {
        colors: {
          background: '#000000',
          surface: '#132840',
          primary: '#3B82F6',
          secondary: '#2563EB',
          error: '#EF4444',
          success: '#22C55E',
        },
      },
    },
  },
})

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')