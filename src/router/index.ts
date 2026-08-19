import { createRouter, createWebHistory } from 'vue-router'

import RegisterView from '@/views/RegisterView.vue'
import TableroView from '@/views/TableroView.vue'
import LoginView from '@/views/LoginView.vue'
import ViewDetailView from '@/views/ViewDetailView.vue'

// Configuración principal de las rutas de la aplicación
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
  {
    // Al entrar a la aplicación mostramos el tablero principal público
    path: '/',
    name: 'tablero',
    component: TableroView,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
  },
  {
  path: '/views/:id',
  name: 'view-detail',
  component: ViewDetailView,
  },

],
})

// Controla el acceso a las rutas según el estado de Sautenticación
router.beforeEach((to) => {
  const storedSession = localStorage.getItem('lasdoscaras_auth')

  // Si intenta entrar a una ruta protegida sin sesión, vuelve al login
  if (to.meta.requiresAuth && !storedSession) {
    return '/login'
  }

  // Si ya inició sesión, no puede volver a la pantalla de login
  if (to.path === '/login' && storedSession) {
    return '/'
  }
})

export default router