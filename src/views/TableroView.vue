<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import AppNavbar from '@/components/AppNavbar.vue'
import ViewCard from '@/components/ViewCard.vue'

import type { Category } from '@/models/category'
import type { PoliticalView } from '@/models/view'

import { getCategories } from '@/services/categoriesService'
import { getViews } from '@/services/viewsService'
import { useAuthStore } from '@/stores/auth'
import {
  getBoardFilters,
  saveBoardFilters,
} from '@/services/filtersService'

// Publicaciones
const views = ref<PoliticalView[]>([])
const totalViews = ref(0)
const authStore = useAuthStore()
// Paginación
const currentPage = ref(1)
const pageSize = 5
const loadingMore = ref(false)
const loadMoreError = ref('')

// Categorías
const categories = ref<Category[]>([])

// Filtros
const selectedCategory = ref('')
const selectedHashtags = ref<string[]>([])
const selectedSort = ref<
  'recent' | 'likes' | 'dislikes'
>('recent')

const restoreFilters = (): void => {
  const savedFilters = getBoardFilters()

  if (!savedFilters) {
    return
  }

  selectedCategory.value =
    savedFilters.categoryId

  selectedSort.value =
    savedFilters.sort

  selectedHashtags.value =
    savedFilters.hashtags
}

// Búsqueda
const searchQuery = ref('')

// Estados
const loading = ref(true)
const categoriesLoading = ref(true)
const errorMessage = ref('')

// Indica si todavía quedan publicaciones por cargar
const hasMore = computed(() => {
  return views.value.length < totalViews.value
})

// Carga la primera página de publicaciones
const loadViews = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''
  loadMoreError.value = ''
  currentPage.value = 1

  try {
    const response = await getViews(
      {
        category:
          selectedCategory.value || undefined,
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
        'Ocurrió un error inesperado.'
    }
  } finally {
    loading.value = false
  }
}

// Carga la siguiente página y conserva las anteriores
const loadMoreViews = async (): Promise<void> => {
  if (
    !hasMore.value ||
    loadingMore.value
  ) {
    return
  }

  loadingMore.value = true
  loadMoreError.value = ''

  const nextPage = currentPage.value + 1

  try {
    const response = await getViews(
      {
        category:
          selectedCategory.value || undefined,
        sort: selectedSort.value,
        page: nextPage,
        limit: pageSize,
      },
      authStore.token ?? undefined,
    )

    views.value.push(...response.views)
    totalViews.value = response.total
    currentPage.value = nextPage
  } catch (error) {
    if (error instanceof Error) {
      loadMoreError.value = error.message
    } else {
      loadMoreError.value =
        'No fue posible cargar más publicaciones.'
    }
  } finally {
    loadingMore.value = false
  }
}

// Carga las categorías reales del API
const loadCategories = async (): Promise<void> => {
  categoriesLoading.value = true

  try {
    const response = await getCategories()

    categories.value = response.categories
  } catch (error) {
    console.error(
      'No fue posible cargar las categorías.',
      error,
    )
  } finally {
    categoriesLoading.value = false
  }
}

// Cambia la categoría y vuelve a la primera página
const selectCategory = async (
  categoryId: string,
): Promise<void> => {
  selectedCategory.value = categoryId

  saveBoardFilters({
    categoryId: selectedCategory.value,
    sort: selectedSort.value,
    hashtags: selectedHashtags.value,
  })

  await loadViews()
}

// Cambia el orden y vuelve a la primera página
const handleSortChange = async (): Promise<void> => {
  saveBoardFilters({
    categoryId: selectedCategory.value,
    sort: selectedSort.value,
    hashtags: selectedHashtags.value,
  })
  await loadViews()
}

// Carga inicial
onMounted(async () => {
  restoreFilters()

  await Promise.all([
    loadCategories(),
    loadViews(),
  ])
})
</script>

<template>
  <AppNavbar
    v-model:searchQuery="searchQuery"
  />

  <main class="dashboard-page">
    <section class="dashboard-container">
      <!-- Encabezado -->
      <header class="dashboard-header">
        <div>
          <span class="dashboard-label">
            LAS DOS CARAS
          </span>

          <h1>Tablero Principal</h1>

          <p>
            Explora diferentes puntos de vista sobre los temas
            que generan conversación.
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

      <!-- Controles -->
      <section
        id="categories"
        class="dashboard-controls"
        aria-label="Filtros de publicaciones"
      >
        <div class="filter-section">
          <span class="filter-label">
            Categorías
          </span>

          <div
            v-if="categoriesLoading"
            class="categories-loading"
          >
            Cargando categorías...
          </div>

          <div
            v-else
            class="category-list"
          >
            <button
              type="button"
              class="category-button"
              :class="{
                active: selectedCategory === '',
              }"
              @click="selectCategory('')"
            >
              Todas
            </button>

            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              class="category-button"
              :class="{
                active:
                  selectedCategory === category.id,
              }"
              @click="selectCategory(category.id)"
            >
              {{ category.name }}
            </button>
          </div>
        </div>

        <div class="sort-section">
          <label for="sort">
            Ordenar por
          </label>

          <select
            id="sort"
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

      <!-- Cargando inicial -->
      <div
        v-if="loading"
        class="state-container"
      >
        <div class="loader"></div>

        <p>Cargando publicaciones...</p>
      </div>

      <!-- Error inicial -->
      <div
        v-else-if="errorMessage"
        class="state-container error-state"
      >
        <strong>
          No pudimos cargar el tablero.
        </strong>

        <p>
          {{ errorMessage }}
        </p>

        <button
          type="button"
          @click="loadViews"
        >
          Intentar nuevamente
        </button>
      </div>

      <!-- Estado vacío -->
      <div
        v-else-if="views.length === 0"
        class="state-container"
      >
        <strong>
          No encontramos publicaciones.
        </strong>

        <p>
          Intenta seleccionar otra categoría
          o cambiar los filtros.
        </p>
      </div>

      <!-- Publicaciones -->
      <template v-else>
        <section
          class="views-list"
          aria-label="Publicaciones"
        >
          <ViewCard
            v-for="view in views"
            :key="view.id"
            :view="view"
          />
        </section>

        <!-- Error al cargar otra página -->
        <p
          v-if="loadMoreError"
          class="load-more-error"
          role="alert"
        >
          {{ loadMoreError }}
        </p>

        <!-- Cargar más -->
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
            <span
              v-if="loadingMore"
              class="small-loader"
            ></span>

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
.dashboard-page {
  min-height: calc(100vh - 72px);
  padding: 55px 24px;
  background: #f7f7fb;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.dashboard-container {
  width: 100%;
  max-width: 1050px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 28px;
}

.dashboard-label {
  display: inline-block;
  margin-bottom: 9px;
  color: #6d28d9;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
}

.dashboard-header h1 {
  margin: 0 0 8px;
  color: #18181b;
  font-size: 36px;
  letter-spacing: -1.2px;
}

.dashboard-header p {
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

/* Filtros */

.dashboard-controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 25px;
  margin-bottom: 25px;
  padding: 18px 20px;
  border: 1px solid #e8e7ef;
  border-radius: 14px;
  background: #ffffff;
}

.filter-section {
  min-width: 0;
  flex: 1;
}

.filter-label,
.sort-section label {
  display: block;
  margin-bottom: 9px;
  color: #71717a;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.category-button {
  padding: 8px 11px;
  border: 1px solid #e4e4e7;
  border-radius: 20px;
  background: #ffffff;
  color: #71717a;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.category-button:hover {
  border-color: #c4b5fd;
  color: #6d28d9;
}

.category-button.active {
  border-color: #6d28d9;
  background: #6d28d9;
  color: #ffffff;
}

.categories-loading {
  color: #a1a1aa;
  font-size: 12px;
}

.sort-section {
  width: 170px;
  flex-shrink: 0;
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
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.08);
}

/* Publicaciones */

.views-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Cargar más */

.load-more-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  margin-top: 30px;
}

.load-more-button {
  display: flex;
  min-width: 150px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px 20px;
  border: 1px solid #6d28d9;
  border-radius: 10px;
  background: #ffffff;
  color: #6d28d9;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s ease;
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
  margin: 18px 0 0;
  color: #b91c1c;
  font-size: 12px;
  text-align: center;
}

.small-loader {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Estados */

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
  margin-top: 5px;
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  background: #6d28d9;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.error-state button:hover {
  background: #5b21b6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 800px) {
  .dashboard-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .sort-section {
    width: 100%;
  }
}

@media (max-width: 700px) {
  .dashboard-page {
    padding: 35px 16px;
  }

  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 18px;
  }

  .dashboard-header h1 {
    font-size: 30px;
  }
}

/* Tema oscuro */

:global(html[data-theme='dark'] .dashboard-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .dashboard-label) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .dashboard-header h1) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .dashboard-header p) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .results) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

/* Filtros */

:global(html[data-theme='dark'] .dashboard-controls) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .filter-label),
:global(html[data-theme='dark'] .sort-section label) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .category-button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .category-button:hover) {
  border-color: #8b5cf6;
  background: #25243a;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .category-button.active) {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

:global(html[data-theme='dark'] .categories-loading) {
  color: #71717a;
}

:global(html[data-theme='dark'] .sort-section select) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .sort-section select:focus) {
  border-color: #8b5cf6;
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.15);
}

/* Estados */

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

/* Cargar más */

:global(html[data-theme='dark'] .load-more-button) {
  border-color: #8b5cf6;
  background: #171728;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .load-more-button:hover:not(:disabled)) {
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