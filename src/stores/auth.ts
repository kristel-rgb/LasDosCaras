import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { User } from '@/models/auth'

// Store global encargado de mantener la sesión del usuario
export const useAuthStore = defineStore('auth', () => {
  // Token JWT recibido después de un login exitoso
  const token = ref<string | null>(null)

  // Datos del usuario autenticado
  const user = ref<User | null>(null)

  // Indica si hay una sesión activa
  const isAuthenticated = ref(false)

  // Guarda el token y los datos del usuario
  const setSession = (newToken: string, newUser: User) => {
    token.value = newToken
    user.value = newUser
    isAuthenticated.value = true

    // Persistimos la sesión para recuperarla al recargar la página
    localStorage.setItem(
      'lasdoscaras_auth',
      JSON.stringify({
        token: newToken,
        user: newUser,
      }),
    )
  }

  // Elimina completamente la sesión del usuario
  const logout = () => {
    token.value = null
    user.value = null
    isAuthenticated.value = false

    localStorage.removeItem('lasdoscaras_auth')
    localStorage.removeItem('lasdoscaras_favorites')
  }

  // Recupera la sesión guardada cuando la aplicación inicia
  const restoreSession = () => {
  const storedSession = localStorage.getItem('lasdoscaras_auth')

  // Si no existe una sesión guardada, no hacemos nada
  if (!storedSession) {
    return
  }

  try {
    const parsedSession = JSON.parse(storedSession)

    token.value = parsedSession.token
    user.value = parsedSession.user
    isAuthenticated.value = true
  } catch {
    // Si los datos guardados están corruptos, limpiamos la sesión
    logout()
  }
}

  return {
    token,
    user,
    isAuthenticated,
    setSession,
    logout,
    restoreSession,
  }
})