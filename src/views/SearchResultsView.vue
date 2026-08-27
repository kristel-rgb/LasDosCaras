<script setup lang="ts">
import {
  computed,
  ref,
  watch,
} from 'vue'
import {
  useRoute,
  useRouter,
} from 'vue-router'

import AppNavbar from '@/components/AppNavbar.vue'
import ViewCard from '@/components/ViewCard.vue'

import type { PoliticalView } from '@/models/view'

import { searchGlobal } from '@/services/searchService'
import { getViewById } from '@/services/viewsService'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Término actual
const searchQuery = ref('')

// Término de la búsqueda que realmente está cargada
const activeSearchQuery = ref('')

// Publicaciones completas encontradas
const views = ref<PoliticalView[]>([])

// Estados
const loading = ref(false)
const errorMessage = ref('')

// Total de publicaciones encontradas
const totalResults = computed(() => {
  return views.value.length
})

// Ejecuta la búsqueda y recupera las publicaciones completas
const loadSearch = async (
  term: string,
): Promise<void> => {
  const cleanTerm = term.trim()
  activeSearchQuery.value = cleanTerm

  if (!cleanTerm) {
    views.value = []
    errorMessage.value = ''
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // GET /search?q=
    const searchResponse =
      await searchGlobal(cleanTerm)

    // El API de búsqueda devuelve resultados resumidos.
    // Recuperamos cada publicación completa para reutilizar
    // la misma tarjeta del tablero principal.
    const detailedViews =
      await Promise.all(
        searchResponse.views.map(
          (view) =>
            getViewById(
              view.id,
              authStore.token ?? undefined,
            ),
        ),
      )

    views.value = detailedViews
  } catch (error) {
    views.value = []

    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value =
        'Ocurrió un error durante la búsqueda.'
    }
  } finally {
    loading.value = false
  }
}

// Búsqueda desde el campo de esta pantalla
const submitSearch = async (): Promise<void> => {
  const term = searchQuery.value.trim()

  if (!term) {
    return
  }

  await router.push({
    path: '/search',
    query: {
      q: term,
    },
  })
}

// Escucha el parámetro ?q=.
// Esto permite recargar o compartir directamente la URL.
watch(
  () => route.query.q,
  async (value) => {
    const term =
      typeof value === 'string'
        ? value.trim()
        : ''

    searchQuery.value = term

    if (!term) {
      views.value = []
      errorMessage.value = ''
      loading.value = false
      return
    }

    await loadSearch(term)
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <AppNavbar
    v-model:searchQuery="searchQuery"
  />

  <main class="search-page">
    <section class="search-container">
      <header class="search-header">
        <span class="search-label">
          BÚSQUEDA
        </span>

        <h1>
          Resultados de búsqueda
        </h1>

        <p v-if="activeSearchQuery">
            Resultados para:
            <strong>
                "{{ activeSearchQuery }}"
            </strong>
        </p>
      </header>

      <!-- Campo editable para refinar la búsqueda -->
      <form
        class="search-form"
        @submit.prevent="submitSearch"
      >
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Buscar publicaciones..."
          aria-label="Buscar publicaciones"
        />

        <button
          type="submit"
          :disabled="!searchQuery.trim()"
        >
          Buscar
        </button>
      </form>

      <!-- Sin término -->
      <div
        v-if="!searchQuery.trim() && !loading"
        class="state-container"
      >
        <strong>
          Escribe un término para buscar.
        </strong>

        <p>
          Puedes buscar por título,
          contenido o hashtag.
        </p>
      </div>

      <!-- Cargando -->
      <div
        v-else-if="loading"
        class="state-container"
      >
        <div class="loader"></div>

        <p>
          Buscando publicaciones...
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="errorMessage"
        class="state-container error-state"
      >
        <strong>
          No fue posible realizar la búsqueda.
        </strong>

        <p>
          {{ errorMessage }}
        </p>

        <button
          type="button"
          @click="loadSearch(searchQuery)"
        >
          Intentar nuevamente
        </button>
      </div>

      <!-- Sin resultados -->
      <div
        v-else-if="views.length === 0"
        class="state-container"
      >
        <strong>
          No se encontraron publicaciones
          para "{{ activeSearchQuery }}".
        </strong>

        <p>
          Intenta utilizar un término más general
          o ampliar la búsqueda.
        </p>
      </div>

      <!-- Resultados -->
      <template v-else>
        <div class="results-summary">
          <strong>
            {{ totalResults }}
          </strong>

          {{
            totalResults === 1
              ? 'resultado encontrado'
              : 'resultados encontrados'
          }}
        </div>

        <section
          class="views-list"
          aria-label="Resultados de búsqueda"
        >
          <ViewCard
            v-for="view in views"
            :key="view.id"
            :view="view"
            :highlight-term="activeSearchQuery"
          />
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
/* =========================
   MOBILE FIRST
   Base: móvil
   ========================= */

.search-page {
  min-height: calc(100vh - 72px);
  padding: 32px 16px 50px;
  background: #f7f7fb;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.search-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* =========================
   Encabezado
   ========================= */

.search-header {
  margin-bottom: 25px;
}

.search-label {
  display: inline-block;
  margin-bottom: 9px;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 2px;
}

.search-header h1 {
  margin: 0 0 8px;
  color: #18181b;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -1.2px;
}

.search-header p {
  margin: 0;
  color: #71717a;
  font-size: 15px;
  line-height: 1.6;
}

.search-header strong {
  color: #3f3f46;
}

/* =========================
   Formulario de búsqueda
   ========================= */

.search-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 25px;
  padding: 18px;
  border: 1px solid #e8e7ef;
  border-radius: 14px;
  background: #ffffff;
}

.search-form input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  outline: none;
  background: #fafafa;
  color: #18181b;
  font-family: inherit;
  font-size: 15px;
}

.search-form input:focus {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.08);
}

.search-form button,
.error-state button {
  padding: 11px 18px;
  border: none;
  border-radius: 9px;
  background: #6d28d9;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.search-form button {
  width: 100%;
}

.search-form button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* =========================
   Resumen de resultados
   ========================= */

.results-summary {
  margin-bottom: 20px;
  color: #71717a;
  font-size: 14px;
}

.results-summary strong {
  color: #27272a;
}

/* =========================
   Publicaciones
   ========================= */

.views-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* =========================
   Estados
   ========================= */

.state-container {
  display: flex;
  min-height: 270px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #71717a;
  text-align: center;
}

.state-container strong {
  color: #27272a;
  font-size: 18px;
}

.state-container p {
  max-width: 480px;
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
}

.error-state button {
  margin-top: 8px;
}

.loader {
  width: 28px;
  height: 28px;
  border: 3px solid #e4e4e7;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   TABLET
   ========================= */

@media (min-width: 701px) {
  .search-page {
    padding: 45px 24px 60px;
  }

  .search-container {
    max-width: 1100px;
  }

  .search-header h1 {
    font-size: 34px;
  }

  .search-form {
    flex-direction: row;
  }

  .search-form input {
    flex: 1;
  }

  .search-form button {
    width: auto;
    flex-shrink: 0;
  }
}

/* =========================
   ESCRITORIO
   ========================= */

@media (min-width: 1200px) {
  .search-page {
    padding: 50px 32px 70px;
  }

  .search-container {
    max-width: 1450px;
  }

  .search-header h1 {
    font-size: 36px;
  }
}

/* =========================
   PANTALLAS GRANDES
   ========================= */

@media (min-width: 1600px) {
  .search-container {
    max-width: 1500px;
  }
}

/* =========================
   Tema oscuro
   ========================= */

:global(html[data-theme='dark'] .search-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .search-label) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .search-header h1),
:global(html[data-theme='dark'] .state-container strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .search-header p),
:global(html[data-theme='dark'] .state-container),
:global(html[data-theme='dark'] .results-summary) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .search-header strong),
:global(html[data-theme='dark'] .results-summary strong) {
  color: #e4e4e7;
}

:global(html[data-theme='dark'] .search-form) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .search-form input) {
  border-color: #343447;
  background: #1b1b2d;
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .search-form input:focus) {
  border-color: #8b5cf6;
  background: #202034;
}
</style>