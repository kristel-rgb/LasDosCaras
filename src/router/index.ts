import { createRouter, createWebHistory } from 'vue-router'

import RegisterView from '@/views/RegisterView.vue'
import TableroView from '@/views/TableroView.vue'
import LoginView from '@/views/LoginView.vue'
import ViewDetailView from '@/views/ViewDetailView.vue'
import CreateEditView from '@/views/CreateEditView.vue'
import CategoryView from '@/views/CategoryView.vue'
import SearchResultsView from '@/views/SearchResultsView.vue'

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
      path: '/views/new',
      name: 'view-create',
      component: CreateEditView,
      meta: { requiresAuth: true },
    },
    {
      path: '/views/:id/edit',
      name: 'view-edit',
      component: CreateEditView,
      meta: { requiresAuth: true },
    },
    {
      path: '/views/:id',
      name: 'view-detail',
      component: ViewDetailView,
    },
    {
      path: '/categories/:id',
      name: 'category-detail',
      component: CategoryView,
    },
    {
      path: '/search',
      name: 'search-results',
      component: SearchResultsView,
    },
  ],

  scrollBehavior(to, from, savedPosition) {
    // Mantiene la posición al usar Atrás / Adelante
    if (savedPosition) {
      return savedPosition
    }

    // Si la URL contiene un #, se desplaza a ese elemento
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: 90,
      }
    }

    // En una navegación normal, inicia arriba
    return {
      top: 0,
    }
  },
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
    return '/'
  }
})

export default router