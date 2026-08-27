import { createRouter, createWebHistory } from 'vue-router'

import RegisterView from '@/views/RegisterView.vue'
import TableroView from '@/views/TableroView.vue'
import LoginView from '@/views/LoginView.vue'
import ViewDetailView from '@/views/ViewDetailView.vue'
import CreateEditView from '@/views/CreateEditView.vue'
import CategoryView from '@/views/CategoryView.vue'
import SearchResultsView from '@/views/SearchResultsView.vue'
import AuthorProfileView from '@/views/AuthorProfileView.vue'
import ForbiddenView from '@/views/ForbiddenView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import AdminUsersView from '@/views/AdminUsersView.vue'
import AdminCategoriesView from '@/views/AdminCategoriesView.vue'
import AdminModerationView from '@/views/AdminModerationView.vue'
import ProfileView from '@/views/ProfileView.vue'
import {
  getStorage,
  removeStorage,
} from '@/utils/cache'

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
    {
      path: '/authors/:id',
      name: 'author-profile',
      component: AuthorProfileView,
    },

    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: {
        requiresAuth: true,
      },
    },

    // Rutas exclusivas para superadmin
    {
      path: '/admin/users',
      name: 'admin-users',
      component: AdminUsersView,
      meta: {
        requiresAuth: true,
        requiresSuperadmin: true,
      },
    },
    {
      path: '/admin/categories',
      name: 'admin-categories',
      component: AdminCategoriesView,
      meta: {
        requiresAuth: true,
        requiresSuperadmin: true,
      },
    },
    {
      path: '/admin/moderation',
      name: 'admin-moderation',
      component: AdminModerationView,
      meta: {
        requiresAuth: true,
        requiresSuperadmin: true,
      },
    },
    // Acceso denegado
    {
      path: '/403',
      name: 'forbidden',
      component: ForbiddenView,
    },

    // Siempre debe ir de última
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
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
  const storedSession =
    getStorage<{
      user?: {
        role?: string
      }
    }>(
      'lasdoscaras_auth',
    )

  // Si intenta entrar a una ruta protegida
  // sin sesión, vuelve al login.
  if (
    to.meta.requiresAuth &&
    !storedSession
  ) {
    return '/login'
  }

  // Si la ruta requiere superadmin,
  // validamos el rol.
  if (
    to.meta.requiresSuperadmin &&
    storedSession
  ) {
    if (
      storedSession.user?.role !==
      'SUPERADMIN'
    ) {
      return '/403'
    }
  }

  // Si ya inició sesión,
  // no puede volver al login
  // ni al registro.
  if (
    (
      to.path === '/login' ||
      to.path === '/register'
    ) &&
    storedSession
  ) {
    return '/'
  }

  // Limpia una sesión inválida.
  if (
    storedSession &&
    !storedSession.user
  ) {
    removeStorage(
      'lasdoscaras_auth',
    )

    return '/login'
  }
})

export default router