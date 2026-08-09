<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

// Acceso al router y al estado global de autenticación
const router = useRouter()
const authStore = useAuthStore()

// Cierra la sesión y devuelve al usuario al login
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <main>
    <!-- Información básica del usuario autenticado -->
    <h1>LasDosCaras</h1>

    <p>Bienvenida, {{ authStore.user?.name }}</p>
    <p>Correo: {{ authStore.user?.email }}</p>
    <p>Rol: {{ authStore.user?.role }}</p>

    <!-- Permite cerrar la sesión actual -->
    <button @click="handleLogout">
      Cerrar sesión
    </button>
  </main>
</template>