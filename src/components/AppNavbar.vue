<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'

import type { SearchResponse } from '@/models/search'
import { searchGlobal } from '@/services/searchService'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const props = defineProps<{
  searchQuery?: string
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
}>()

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const userMenuOpen = ref(false)

// Estados de búsqueda
const searchOpen = ref(false)
const searchLoading = ref(false)
const searchError = ref('')

const searchResults = ref<SearchResponse>({
  views: [],
  categories: [],
  hashtags: [],
  authors: [],
})

let debounceTimer:
  | ReturnType<typeof setTimeout>
  | undefined

// Inicial del usuario para el avatar
const userInitial = computed(() => {
  return (
    authStore.user?.name
      ?.charAt(0)
      .toUpperCase() ?? 'U'
  )
})

// Indica si la búsqueda encontró algún resultado
const hasSearchResults = computed(() => {
  return (
    searchResults.value.views.length > 0 ||
    searchResults.value.categories.length > 0 ||
    searchResults.value.hashtags.length > 0 ||
    searchResults.value.authors.length > 0
  )
})

// Total de resultados encontrados
const totalSearchResults = computed(() => {
  return (
    searchResults.value.views.length +
    searchResults.value.categories.length +
    searchResults.value.hashtags.length +
    searchResults.value.authors.length
  )
})

// Limpia los resultados de búsqueda
const clearSearchResults = (): void => {
  searchResults.value = {
    views: [],
    categories: [],
    hashtags: [],
    authors: [],
  }

  searchError.value = ''
}

// Actualiza el texto escrito en el buscador
const handleSearch = (event: Event): void => {
  const input = event.target as HTMLInputElement

  emit('update:searchQuery', input.value)

  searchOpen.value = true
}

// Ejecuta la búsqueda global
const executeSearch = async (
  query: string,
): Promise<void> => {
  const term = query.trim()

  if (!term) {
    clearSearchResults()
    searchLoading.value = false
    return
  }

  searchLoading.value = true
  searchError.value = ''

  try {
    searchResults.value =
      await searchGlobal(term)
  } catch (error) {
    if (error instanceof Error) {
      searchError.value = error.message
    } else {
      searchError.value =
        'Ocurrió un error durante la búsqueda.'
    }

    clearSearchResults()
  } finally {
    searchLoading.value = false
  }
}

// Observa lo que escribe el usuario y aplica debounce
watch(
  () => props.searchQuery,
  (newQuery) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const term = newQuery?.trim() ?? ''

    if (!term) {
      clearSearchResults()
      searchOpen.value = false
      return
    }

    searchOpen.value = true

    debounceTimer = setTimeout(() => {
      executeSearch(term)
    }, 350)
  },
)

// Evita dejar el temporizador activo al destruir el componente
onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

// Navega a la página completa de resultados
const goToSearchResults = async (): Promise<void> => {
  const term = props.searchQuery?.trim() ?? ''

  if (!term) {
    return
  }

  searchOpen.value = false

  await router.push({
    path: '/search',
    query: {
      q: term,
    },
  })
}

// Cierra la sesión y mantiene al usuario en el tablero público
const handleLogout = async (): Promise<void> => {
  authStore.logout()
  userMenuOpen.value = false

  await router.push('/')
}
</script>

<template>
  <header class="navbar">
    <div class="navbar-container">
      <!-- Logo -->
      <RouterLink
        class="brand"
        to="/"
      >
        <div class="brand-logo">
          <span>◐</span>
          <span>◑</span>
        </div>

        <span class="brand-name">
          LasDosCaras
        </span>
      </RouterLink>

      <!-- Navegación -->
      <nav
        class="navigation"
        aria-label="Navegación principal"
      >
        <RouterLink
          class="nav-link"
          to="/"
        >
          Inicio
        </RouterLink>

        <RouterLink
          class="nav-link"
          to="/#categories"
        >
          Categorías
        </RouterLink>
      </nav>

      <!-- Buscador global -->
      <div class="search-wrapper">
        <div class="search-container">
          <button
            class="search-icon"
            type="button"
            aria-label="Buscar"
            @click="goToSearchResults"
          >
            ⌕
          </button>

          <input
            :value="props.searchQuery"
            type="search"
            placeholder="Buscar publicaciones..."
            aria-label="Buscar publicaciones"
            autocomplete="off"
            @input="handleSearch"
            @focus="
              searchOpen =
                Boolean(props.searchQuery?.trim())
            "
            @keydown.esc="searchOpen = false"
            @keydown.enter.prevent="goToSearchResults"
          />
        </div>

        <!-- Resultados de búsqueda -->
        <div
          v-if="
            searchOpen &&
            Boolean(props.searchQuery?.trim())
          "
          class="search-dropdown"
        >
          <!-- Cargando -->
          <div
            v-if="searchLoading"
            class="search-state"
          >
            <span class="search-loader"></span>
            Buscando...
          </div>

          <!-- Error -->
          <div
            v-else-if="searchError"
            class="search-state search-error"
          >
            {{ searchError }}
          </div>

          <!-- Resultados -->
          <template v-else-if="hasSearchResults">
            <div class="search-summary">
              {{ totalSearchResults }}
              {{
                totalSearchResults === 1
                  ? 'resultado'
                  : 'resultados'
              }}
            </div>

            <!-- Publicaciones -->
            <section
              v-if="searchResults.views.length"
              class="result-group"
            >
              <h3>Publicaciones</h3>

              <div
                v-for="view in searchResults.views"
                :key="view.id"
                class="search-result"
              >
                <span class="result-icon">
                  ◐◑
                </span>

                <div class="result-content">
                  <strong>
                    {{
                      view.sides.find(
                        (side) =>
                          side.type === 'SIDE',
                      )?.title
                    }}
                  </strong>

                  <span>
                    {{ view.category.name }}
                    ·
                    {{ view.author.name }}
                  </span>
                </div>
              </div>
            </section>

            <!-- Categorías -->
            <section
              v-if="
                searchResults.categories.length
              "
              class="result-group"
            >
              <h3>Categorías</h3>

              <div
                v-for="
                  category in
                    searchResults.categories
                "
                :key="category.id"
                class="search-result compact-result"
              >
                <span class="result-icon">
                  #
                </span>

                <div class="result-content">
                  <strong>
                    {{ category.name }}
                  </strong>
                </div>
              </div>
            </section>

            <!-- Hashtags -->
            <section
              v-if="
                searchResults.hashtags.length
              "
              class="result-group"
            >
              <h3>Hashtags</h3>

              <div class="tag-results">
                <span
                  v-for="
                    hashtag in
                      searchResults.hashtags
                  "
                  :key="hashtag.id"
                  class="search-tag"
                >
                  #{{ hashtag.name }}
                </span>
              </div>
            </section>

            <!-- Autores -->
            <section
              v-if="
                searchResults.authors.length
              "
              class="result-group"
            >
              <h3>Autores</h3>

              <div
                v-for="
                  author in searchResults.authors
                "
                :key="author.id"
                class="search-result compact-result"
              >
                <span class="result-avatar">
                  {{
                    author.name
                      .charAt(0)
                      .toUpperCase()
                  }}
                </span>

                <div class="result-content">
                  <strong>
                    {{ author.name }}
                  </strong>
                </div>
              </div>
            </section>
          </template>

          <!-- Sin resultados -->
          <div
            v-else
            class="search-state"
          >
            <strong>
              No encontramos resultados.
            </strong>

            <span>
              Intenta utilizar otra palabra.
            </span>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="navbar-actions">
        <button
            class="theme-button"
            type="button"
            :aria-label="
                themeStore.theme === 'light'
                ? 'Activar tema oscuro'
                : 'Activar tema claro'
            "
            :title="
                themeStore.theme === 'light'
                ? 'Tema oscuro'
                : 'Tema claro'
            "
            @click="themeStore.toggleTheme"
            >
            {{ themeStore.theme === 'light' ? '☾' : '☀' }}
            </button>
        <!-- Usuario autenticado -->
        <template v-if="authStore.isAuthenticated">
          <button
            class="create-button"
            type="button"
            @click="router.push('/views/new')"
          >
            <span>+</span>
            Publicar
          </button>

          <div class="user-menu">
            <button
              class="user-button"
              type="button"
              :aria-expanded="userMenuOpen"
              aria-label="Abrir menú de usuario"
              @click="
                userMenuOpen = !userMenuOpen
              "
            >
              <span class="user-avatar">
                {{ userInitial }}
              </span>

              <span class="user-name">
                {{ authStore.user?.name }}
              </span>

              <span class="chevron">
                ▾
              </span>
            </button>

            <div
              v-if="userMenuOpen"
              class="dropdown"
            >
              <div class="dropdown-user">
                <strong>
                  {{ authStore.user?.name }}
                </strong>

                <span>
                  {{ authStore.user?.email }}
                </span>
              </div>

              <div class="dropdown-divider"></div>
                <RouterLink
                  class="dropdown-admin-link"
                  :to="{ name: 'profile' }"
                  @click="userMenuOpen = false"
                >
                  Mi perfil
                </RouterLink>
              <template
                v-if="
                  authStore.user?.role === 'SUPERADMIN'
                "
              >
                <div class="dropdown-admin">
                  <span class="dropdown-section-label">
                    Administración
                  </span>

                  <RouterLink
                    class="dropdown-admin-link"
                    :to="{ name: 'admin-users' }"
                    @click="userMenuOpen = false"
                  >
                    Usuarios
                  </RouterLink>

                  <RouterLink
                    class="dropdown-admin-link"
                    :to="{ name: 'admin-categories' }"
                    @click="userMenuOpen = false"
                  >
                    Categorías
                  </RouterLink>

                   <RouterLink
                    class="dropdown-admin-link"
                    :to="{ name: 'admin-moderation' }"
                    @click="userMenuOpen = false"
                  >
                    Moderación
                  </RouterLink>
                </div>

                <div class="dropdown-divider"></div>
              
              </template>

              <button
                type="button"
                @click="handleLogout"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </template>

        <!-- Usuario anónimo -->
        <template v-else>
          <RouterLink
            class="login-link"
            to="/login"
          >
            Iniciar sesión
          </RouterLink>

          <RouterLink
            class="register-link"
            to="/register"
          >
            Crear cuenta
          </RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<style>
html,
body,
#app {
  margin: 0;
  width: 100%;
  min-height: 100%;
}

body {
  min-width: 320px;
}

html[data-theme='dark'] body {
  background: #0f1020;
}
</style>

<style scoped>
.theme-button {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid #e4e4e7;
  border-radius: 50%;
  background: #ffffff;
  color: #52525b;
  font-family: inherit;
  font-size: 17px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.theme-button:hover {
  border-color: #c4b5fd;
  background: #f5f3ff;
  color: #6d28d9;
  transform: translateY(-1px);
}

.theme-button:focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  border-bottom: 1px solid #e8e7ef;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
}

.navbar-container {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  max-width: 1200px;
  min-height: 72px;
  align-items: center;
  gap: 28px;
  margin: 0 auto;
  padding: 0 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  color: #18181b;
  text-decoration: none;
}

.brand-logo {
  display: flex;
  padding-right: 7px;
  color: #6d28d9;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -8px;
}

.brand-name {
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.4px;
}

.navigation {
  display: flex;
  align-items: center;
  gap: 5px;
}

.nav-link {
  padding: 8px 10px;
  border-radius: 8px;
  color: #71717a;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: 0.2s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: #f5f3ff;
  color: #6d28d9;
}

.nav-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
}

/* Buscador */

.search-wrapper {
  position: relative;
  max-width: 360px;
  flex: 1;
  margin-left: auto;
}

.search-container {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 13px;
  color: #a1a1aa;
  font-size: 18px;
  transform: translateY(-50%);
  border: none;
  padding: 0;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}

.search-container input {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 14px 10px 39px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  outline: none;
  background: #fafafa;
  color: #18181b;
  font-family: inherit;
  font-size: 13px;
  transition: 0.2s ease;
}

.search-container input:focus {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.08);
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  left: 0;
  z-index: 200;
  max-height: 520px;
  overflow-y: auto;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  box-shadow:
    0 18px 45px rgba(15, 16, 32, 0.14);
}

.search-summary {
  padding: 11px 15px;
  border-bottom: 1px solid #f0f0f0;
  color: #a1a1aa;
  font-size: 10px;
  font-weight: 700;
}

.result-group {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.result-group:last-child {
  border-bottom: none;
}

.result-group h3 {
  margin: 0 0 8px;
  color: #71717a;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px;
  border-radius: 9px;
}

.search-result:hover {
  background: #faf9ff;
}

.result-icon {
  display: flex;
  width: 31px;
  height: 31px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 11px;
  font-weight: 900;
}

.result-avatar {
  display: flex;
  width: 31px;
  height: 31px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #7c3aed
    );
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.result-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.result-content strong {
  overflow: hidden;
  color: #27272a;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-content span {
  overflow: hidden;
  color: #a1a1aa;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-result {
  padding-top: 6px;
  padding-bottom: 6px;
}

.tag-results {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.search-tag {
  padding: 6px 9px;
  border-radius: 18px;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 10px;
  font-weight: 700;
}

.search-state {
  display: flex;
  min-height: 90px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  padding: 18px;
  color: #a1a1aa;
  font-size: 11px;
  text-align: center;
}

.search-state strong {
  color: #52525b;
  font-size: 12px;
}

.search-error {
  color: #b91c1c;
}

.search-loader {
  width: 20px;
  height: 20px;
  border: 2px solid #e4e4e7;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: search-spin 0.8s linear infinite;
}

@keyframes search-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Acciones */

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.create-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: none;
  border-radius: 9px;
  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #7c3aed
    );
  color: #ffffff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.create-button span {
  font-size: 17px;
  line-height: 1;
}

.user-menu {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 5px;
  border: 1px solid #e4e4e7;
  border-radius: 30px;
  background: #ffffff;
  color: #3f3f46;
  font-family: inherit;
  cursor: pointer;
}

.user-avatar {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #7c3aed
    );
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.user-name {
  max-width: 110px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  color: #a1a1aa;
  font-size: 11px;
}

.dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 15px 40px rgba(15, 16, 32, 0.12);
}

.dropdown-user {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 15px;
}

.dropdown-user strong {
  color: #27272a;
  font-size: 13px;
}

.dropdown-user span {
  overflow: hidden;
  color: #a1a1aa;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-divider {
  height: 1px;
  background: #f0f0f0;
}

.dropdown-admin {
  padding: 10px;
}

.dropdown-section-label {
  display: block;
  padding: 4px 7px 7px;
  color: #a1a1aa;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dropdown-admin-link {
  display: block;
  padding: 9px 10px;
  border-radius: 8px;
  color: #52525b;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.dropdown-admin-link:hover {
  background: #f5f3ff;
  color: #6d28d9;
}

.dropdown > button {
  width: 100%;
  padding: 12px 15px;
  border: none;
  background: transparent;
  color: #b91c1c;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.dropdown > button:hover {
  background: #fef2f2;
}

.login-link,
.register-link {
  padding: 10px 13px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.login-link {
  color: #52525b;
}

.register-link {
  background: #6d28d9;
  color: #ffffff;
}

@media (max-width: 950px) {
  .navigation {
    display: none;
  }

  .user-name,
  .chevron {
    display: none;
  }

  .search-wrapper {
    max-width: none;
  }
}

@media (max-width: 700px) {
  .navbar-container {
    gap: 12px;
    padding: 0 16px;
  }

  .brand-name {
    display: none;
  }

  .search-wrapper {
    flex: 1;
  }

  .create-button {
    width: 38px;
    height: 38px;
    justify-content: center;
    padding: 0;
    border-radius: 50%;
    font-size: 0;
  }

  .create-button span {
    font-size: 20px;
  }

  .login-link {
    display: none;
  }

  .register-link {
    padding: 9px 10px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .navbar-container {
    min-height: 64px;
  }

  .search-container input {
    padding-right: 8px;
    font-size: 12px;
  }

  .register-link {
    display: none;
  }

  .search-dropdown {
    position: fixed;
    top: 70px;
    right: 12px;
    left: 12px;
    max-height: calc(100vh - 90px);
  }
}

/* Tema oscuro */

:global(html[data-theme='dark'] .navbar) {
  border-bottom-color: #29293d;
  background: rgba(15, 16, 32, 0.96);
}

:global(html[data-theme='dark'] .brand) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .brand-logo) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .nav-link) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .nav-link:hover),
:global(html[data-theme='dark'] .nav-link.router-link-active) {
  background: #27243d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .search-container input) {
  border-color: #343447;
  background: #1b1b2d;
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .search-container input::placeholder) {
  color: #71717a;
}

:global(html[data-theme='dark'] .search-container input:focus) {
  border-color: #8b5cf6;
  background: #202034;
}

:global(html[data-theme='dark'] .search-dropdown) {
  border-color: #343447;
  background: #1b1b2d;
  box-shadow:
    0 18px 45px rgba(0, 0, 0, 0.35);
}

:global(html[data-theme='dark'] .search-summary),
:global(html[data-theme='dark'] .result-group) {
  border-color: #29293d;
}

:global(html[data-theme='dark'] .result-group h3) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .search-result:hover) {
  background: #25243a;
}

:global(html[data-theme='dark'] .result-content strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .result-content span) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .result-icon),
:global(html[data-theme='dark'] .search-tag) {
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .search-state) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .search-state strong) {
  color: #e4e4e7;
}

:global(html[data-theme='dark'] .theme-button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #facc15;
}

:global(html[data-theme='dark'] .theme-button:hover) {
  border-color: #7c3aed;
  background: #29243f;
}

:global(html[data-theme='dark'] .user-button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #e4e4e7;
}

:global(html[data-theme='dark'] .dropdown) {
  border-color: #343447;
  background: #1b1b2d;
  box-shadow:
    0 15px 40px rgba(0, 0, 0, 0.35);
}

:global(html[data-theme='dark'] .dropdown-user strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .dropdown-user span) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .dropdown-divider) {
  background: #343447;
}

:global(html[data-theme='dark'] .dropdown > button) {
  color: #f87171;
}

:global(html[data-theme='dark'] .dropdown > button:hover) {
  background: #3b2028;
}

:global(
  html[data-theme='dark']
  .dropdown-section-label
) {
  color: #71717a;
}

:global(
  html[data-theme='dark']
  .dropdown-admin-link
) {
  color: #d4d4d8;
}

:global(
  html[data-theme='dark']
  .dropdown-admin-link:hover
) {
  background: #29243f;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .login-link) {
  color: #d4d4d8;
}
</style>