import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'

// Configuración principal de las rutas de la aplicación
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      // Al entrar a la aplicación enviamos al usuario al login
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
  ],
})

// Controla el acceso a las rutas según el estado de autenticación
router.beforeEach((to) => {
  const storedSession = localStorage.getItem('lasdoscaras_auth')

  // Si intenta entrar a una ruta protegida sin sesión, vuelve al login
  if (to.meta.requiresAuth && !storedSession) {
    return '/login'
  }

  // Si ya inició sesión, no puede volver a la pantalla de login
  if (to.path === '/login' && storedSession) {
    return '/home'
  }
})

export default router