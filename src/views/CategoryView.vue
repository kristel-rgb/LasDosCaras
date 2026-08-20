<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  useRoute,
  useRouter,
} from 'vue-router'

import AppNavbar from '@/components/AppNavbar.vue'
import ViewCard from '@/components/ViewCard.vue'

import type { Category } from '@/models/category'
import type { PoliticalView } from '@/models/view'

import { getCategories } from '@/services/categoriesService'
import { getViews } from '@/services/viewsService'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Categoría actual
const category = ref<Category | null>(null)

// Publicaciones
const views = ref<PoliticalView[]>([])
const totalViews = ref(0)

// Paginación
const currentPage = ref(1)
const pageSize = 5

const loadingMore = ref(false)
const loadMoreError = ref('')

// Orden
const selectedSort = ref<
  'recent' | 'likes' | 'dislikes'
>('recent')

// Estados
const loading = ref(true)
const errorMessage = ref('')

// Obtiene el ID de categoría desde la URL
const categoryId = computed(() => {
  const id = route.params.id

  return typeof id === 'string'
    ? id
    : ''
})

// Indica si quedan publicaciones por cargar
const hasMore = computed(() => {
  return views.value.length < totalViews.value
})

// Obtiene los datos de la categoría actual
const loadCategory = async (): Promise<boolean> => {
  try {
    const response = await getCategories()

    const foundCategory =
      response.categories.find(
        (item) =>
          item.id === categoryId.value &&
          !item.deletedAt,
      )

    if (!foundCategory) {
      category.value = null

      throw new Error(
        'La categoría no fue encontrada.',
      )
    }

    category.value = foundCategory

    return true
  } catch (error) {
    category.value = null

    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value =
        'No fue posible cargar la categoría.'
    }

    return false
  }
}

// Carga la primera página de la categoría
const loadViews = async (): Promise<void> => {
  if (!categoryId.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''
  loadMoreError.value = ''
  currentPage.value = 1

  try {
    const response = await getViews(
      {
        category: categoryId.value,
        sort: selectedSort.value,
        page: 1,
        limit: pageSize,
      },
      authStore.token ?? undefined,
    )

    views.value = response.views
    totalViews.value = response.total
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value =
        'No fue posible cargar las publicaciones.'
    }
  } finally {
    loading.value = false
  }
}

// Carga la siguiente página
const loadMoreViews = async (): Promise<void> => {
  if (
    !hasMore.value ||
    loadingMore.value ||
    !categoryId.value
  ) {
    return
  }

  loadingMore.value = true
  loadMoreError.value = ''

  const nextPage =
    currentPage.value + 1

  try {
    const response = await getViews(
      {
        category: categoryId.value,
        sort: selectedSort.value,
        page: nextPage,
        limit: pageSize,
      },
      authStore.token ?? undefined,
    )

    views.value.push(...response.views)

    totalViews.value =
      response.total

    currentPage.value =
      nextPage
  } catch (error) {
    if (error instanceof Error) {
      loadMoreError.value =
        error.message
    } else {
      loadMoreError.value =
        'No fue posible cargar más publicaciones.'
    }
  } finally {
    loadingMore.value = false
  }
}

// Cambia el orden de las publicaciones
const handleSortChange = async (): Promise<void> => {
  await loadViews()
}

// Carga toda la página
const loadPage = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''

  if (!categoryId.value) {
    errorMessage.value =
      'El identificador de la categoría no es válido.'

    loading.value = false
    return
  }

  const categoryLoaded =
    await loadCategory()

  if (!categoryLoaded) {
    loading.value = false
    return
  }

  await loadViews()
}

// Carga inicial
onMounted(() => {
  loadPage()
})

// Si cambia el ID sin desmontar el componente,
// vuelve a cargar la categoría
watch(
  () => route.params.id,
  () => {
    loadPage()
  },
)
</script>

<template>
  <AppNavbar />

  <main class="category-page">
    <section class="category-container">
      <!-- Regresar -->
      <button
        class="back-button"
        type="button"
        @click="router.push('/')"
      >
        ← Volver al tablero
      </button>

      <!-- Encabezado -->
      <header
        v-if="category"
        class="category-header"
      >
        <div>
          <span class="category-label">
            CATEGORÍA
          </span>

          <h1>
            {{ category.name }}
          </h1>

          <p>
            Explora las publicaciones relacionadas
            con {{ category.name }}.
          </p>
        </div>

        <div class="results">
          {{ totalViews }}
          {{
            totalViews === 1
              ? 'publicación'
              : 'publicaciones'
          }}
        </div>
      </header>

      <!-- Orden -->
      <section
        v-if="category && !loading"
        class="category-controls"
      >
        <div>
          <span class="control-title">
            Publicaciones de
            {{ category.name }}
          </span>
        </div>

        <div class="sort-section">
          <label for="category-sort">
            Ordenar por
          </label>

          <select
            id="category-sort"
            v-model="selectedSort"
            @change="handleSortChange"
          >
            <option value="recent">
              Más recientes
            </option>

            <option value="likes">
              Más likes
            </option>

            <option value="dislikes">
              Más dislikes
            </option>
          </select>
        </div>
      </section>

      <!-- Cargando -->
      <div
        v-if="loading"
        class="state-container"
      >
        <div class="loader"></div>

        <p>
          Cargando categoría...
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="errorMessage"
        class="state-container error-state"
      >
        <strong>
          No pudimos cargar esta categoría.
        </strong>

        <p>
          {{ errorMessage }}
        </p>

        <button
          type="button"
          @click="loadPage"
        >
          Intentar nuevamente
        </button>
      </div>

      <!-- Vacío -->
      <div
        v-else-if="views.length === 0"
        class="state-container"
      >
        <strong>
          Esta categoría todavía no tiene publicaciones.
        </strong>

        <p>
          Cuando existan publicaciones relacionadas,
          aparecerán en esta sección.
        </p>
      </div>

      <!-- Publicaciones -->
      <template v-else>
        <section
          class="views-list"
          :aria-label="`Publicaciones de ${category?.name}`"
        >
          <ViewCard
            v-for="view in views"
            :key="view.id"
            :view="view"
          />
        </section>

        <p
          v-if="loadMoreError"
          class="load-more-error"
          role="alert"
        >
          {{ loadMoreError }}
        </p>

        <div
          v-if="hasMore"
          class="load-more-container"
        >
          <button
            class="load-more-button"
            type="button"
            :disabled="loadingMore"
            @click="loadMoreViews"
          >
            {{
              loadingMore
                ? 'Cargando...'
                : 'Cargar más'
            }}
          </button>

          <span class="loaded-count">
            Mostrando
            {{ views.length }}
            de
            {{ totalViews }}
          </span>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.category-page {
  min-height: calc(100vh - 72px);
  padding: 45px 24px 60px;
  background: #f7f7fb;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.category-container {
  width: 100%;
  max-width: 1050px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: 28px;
  padding: 9px 13px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  color: #52525b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.back-button:hover {
  border-color: #c4b5fd;
  color: #6d28d9;
}

.category-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 28px;
}

.category-label {
  display: inline-block;
  margin-bottom: 9px;
  color: #6d28d9;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
}

.category-header h1 {
  margin: 0 0 8px;
  color: #18181b;
  font-size: 38px;
  letter-spacing: -1.2px;
}

.category-header p {
  max-width: 620px;
  margin: 0;
  color: #71717a;
  font-size: 14px;
  line-height: 1.6;
}

.results {
  flex-shrink: 0;
  padding: 8px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 20px;
  background: #ffffff;
  color: #71717a;
  font-size: 12px;
  font-weight: 700;
}

.category-controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
  padding: 18px 20px;
  border: 1px solid #e8e7ef;
  border-radius: 14px;
  background: #ffffff;
}

.control-title {
  color: #52525b;
  font-size: 12px;
  font-weight: 800;
}

.sort-section {
  width: 170px;
}

.sort-section label {
  display: block;
  margin-bottom: 8px;
  color: #71717a;
  font-size: 11px;
  font-weight: 800;
}

.sort-section select {
  box-sizing: border-box;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  outline: none;
  background: #fafafa;
  color: #52525b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.sort-section select:focus {
  border-color: #8b5cf6;
}

.views-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.state-container {
  display: flex;
  min-height: 280px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  padding: 40px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
  color: #71717a;
  text-align: center;
}

.state-container strong {
  color: #27272a;
  font-size: 16px;
}

.state-container p {
  max-width: 450px;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid #e4e4e7;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error-state button {
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  background: #6d28d9;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.load-more-container {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 10px;
  margin-top: 30px;
}

.load-more-button {
  min-width: 150px;
  padding: 12px 20px;
  border: 1px solid #6d28d9;
  border-radius: 10px;
  background: #ffffff;
  color: #6d28d9;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.load-more-button:hover:not(:disabled) {
  background: #6d28d9;
  color: #ffffff;
}

.load-more-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.loaded-count {
  color: #a1a1aa;
  font-size: 10px;
}

.load-more-error {
  margin-top: 18px;
  color: #b91c1c;
  font-size: 12px;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .category-page {
    padding: 35px 16px;
  }

  .category-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }

  .category-header h1 {
    font-size: 30px;
  }

  .category-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .sort-section {
    width: 100%;
  }
}

/* Tema oscuro */

:global(html[data-theme='dark'] .category-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .back-button) {
  border-color: #343447;
  background: #171728;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .back-button:hover) {
  border-color: #8b5cf6;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .category-label) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .category-header h1) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .category-header p) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .results) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .category-controls) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .control-title) {
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .sort-section label) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .sort-section select) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .state-container) {
  border-color: #29293d;
  background: #171728;
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .state-container strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .loader) {
  border-color: #343447;
  border-top-color: #a78bfa;
}

:global(html[data-theme='dark'] .load-more-button) {
  border-color: #8b5cf6;
  background: #171728;
  color: #c4b5fd;
}

:global(
  html[data-theme='dark']
  .load-more-button:hover:not(:disabled)
) {
  background: #7c3aed;
  color: #ffffff;
}

:global(html[data-theme='dark'] .loaded-count) {
  color: #71717a;
}

:global(html[data-theme='dark'] .load-more-error) {
  color: #f87171;
}
</style>