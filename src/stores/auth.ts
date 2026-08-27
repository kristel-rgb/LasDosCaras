import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { User } from '@/models/auth'

import {
  getStorage,
  removeStorage,
  setStorage,
} from '@/utils/cache'

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
    setStorage(
      'lasdoscaras_auth',
      {
        token: newToken,
        user: newUser,
      },
    )
  }

  // Elimina completamente la sesión del usuario
  const logout = () => {
    token.value = null
    user.value = null
    isAuthenticated.value = false

    removeStorage('lasdoscaras_auth')
    removeStorage('lasdoscaras_favorites')
  }

  // Recupera la sesión guardada cuando la aplicación inicia
  const restoreSession = () => {
    const storedSession =
    getStorage<{
      token: string
      user: User
    }>(
      'lasdoscaras_auth',
    )

  if (!storedSession) {
    return
  }

  token.value = storedSession.token
  user.value = storedSession.user
  isAuthenticated.value = true
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