import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'

// Creamos la aplicación de Vue
const app = createApp(App)

// Creamos Pinia para manejar el estado global
const pinia = createPinia()

// Registramos Pinia y Vue Router en la aplicación
app.use(pinia)
app.use(router)

// Recuperamos la sesión guardada antes de mostrar la aplicación
const authStore = useAuthStore(pinia)
authStore.restoreSession()

// Recuperamos el tema guardado
const themeStore = useThemeStore(pinia)
themeStore.restoreTheme()

// Montamos la aplicación en el HTML principal
app.mount('#app')