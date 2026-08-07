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

// Protege las rutas que requieren una sesión iniciada
router.beforeEach((to) => {
  const storedSession = localStorage.getItem('lasdoscaras_auth')

  // Si la ruta requiere autenticación y no existe sesión, vuelve al login
  if (to.meta.requiresAuth && !storedSession) {
    return '/login'
  }
})

export default router