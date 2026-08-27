<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import {
  useRoute,
  useRouter,
} from 'vue-router'

import {
  getHashtags,
  type Hashtag,
} from '@/services/hashtagsService'

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

// URL y parámetros de la ruta actual
const route = useRoute()
const router = useRouter()

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

// Hashtags
const hashtags = ref<Hashtag[]>([])
const hashtagsLoading = ref(true)
const hashtagSearch = ref('')
const hashtagSuggestionsOpen = ref(false)

const filteredHashtags = computed(() => {
  const search = hashtagSearch.value
    .trim()
    .replace(/^#/, '')
    .toLowerCase()

  if (!search) {
    return []
  }

  return hashtags.value
    .filter((hashtag) =>
      hashtag.name
        .toLowerCase()
        .includes(search),
    )
    .slice(0, 6)
})

// Filtros
const selectedCategory = ref('')
const selectedHashtags = ref<string[]>([])
const selectedSort = ref<
  'recent' | 'likes' | 'dislikes'
>('recent')

const restoreFilters = (): void => {
  const savedFilters =
    getBoardFilters()

  // Primero recuperamos localStorage
  if (savedFilters) {
    selectedCategory.value =
      savedFilters.categoryId

    selectedSort.value =
      savedFilters.sort

    selectedHashtags.value =
      savedFilters.hashtags

    hashtagSearch.value =
      savedFilters.hashtags[0] ?? ''
  }

  // Si existen filtros en la URL,
  // tienen prioridad sobre localStorage.
  const category =
    route.query.category

  if (typeof category === 'string') {
    selectedCategory.value =
      category
  }

  const hashtag =
    route.query.hashtag

  if (typeof hashtag === 'string') {
    const normalizedHashtag =
      hashtag
        .trim()
        .replace(/^#/, '')
        .toLowerCase()

    selectedHashtags.value =
      normalizedHashtag
        ? [normalizedHashtag]
        : []

    hashtagSearch.value =
      normalizedHashtag
  }

  const sort =
    route.query.sort

  if (
    sort === 'recent' ||
    sort === 'likes' ||
    sort === 'dislikes'
  ) {
    selectedSort.value =
      sort
  }
}

const syncFiltersToUrl =
  async (): Promise<void> => {
    const query:
      Record<string, string> = {
        sort: selectedSort.value,
      }

    if (selectedCategory.value) {
      query.category =
        selectedCategory.value
    }

    const hashtag =
      selectedHashtags.value[0]

    if (hashtag) {
      query.hashtag =
        hashtag
    }

    await router.replace({
      query,
    })
  }

const persistFilters =
  async (): Promise<void> => {
    saveBoardFilters({
      categoryId:
        selectedCategory.value,

      sort:
        selectedSort.value,

      hashtags:
        selectedHashtags.value,
    })

    await syncFiltersToUrl()
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
          selectedCategory.value ||
          undefined,

        hashtag:
          selectedHashtags.value[0] ||
          undefined,

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

// Carga la siguiente página conservando las anteriores
const loadMoreViews =
  async (): Promise<void> => {
    if (
      !hasMore.value ||
      loadingMore.value
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
          category:
            selectedCategory.value ||
            undefined,

          hashtag:
            selectedHashtags.value[0] ||
            undefined,

          sort: selectedSort.value,
          page: nextPage,
          limit: pageSize,
        },
        authStore.token ?? undefined,
      )

      views.value.push(
        ...response.views,
      )

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

// Carga las categorías
const loadCategories =
  async (): Promise<void> => {
    categoriesLoading.value = true

    try {
      const response =
        await getCategories()

      categories.value =
        response.categories
    } catch (error) {
      console.error(
        'No fue posible cargar las categorías.',
        error,
      )
    } finally {
      categoriesLoading.value =
        false
    }
  }

// Carga los hashtags disponibles
const loadHashtags =
  async (): Promise<void> => {
    hashtagsLoading.value = true

    try {
      const response =
        await getHashtags()

      hashtags.value =
        response.hashtags
    } catch (error) {
      console.error(
        'No fue posible cargar los hashtags.',
        error,
      )

      hashtags.value = []
    } finally {
      hashtagsLoading.value =
        false
    }
  }

// Cambia la categoría
const selectCategory = async (
  categoryId: string,
): Promise<void> => {
  selectedCategory.value =
    categoryId

  await persistFilters()
  await loadViews()
}

// Aplica el hashtag escrito manualmente
const handleHashtagChange =
  async (): Promise<void> => {
    const normalizedHashtag =
      hashtagSearch.value
        .trim()
        .replace(/^#/, '')
        .toLowerCase()

    selectedHashtags.value =
      normalizedHashtag
        ? [normalizedHashtag]
        : []

    hashtagSearch.value =
      normalizedHashtag

    hashtagSuggestionsOpen.value = false

    await persistFilters()
    await loadViews()
  }

// Selecciona un hashtag del autocomplete
const selectHashtag = async (
  hashtag: string,
): Promise<void> => {
  const normalizedHashtag =
    hashtag
      .trim()
      .replace(/^#/, '')
      .toLowerCase()

  hashtagSearch.value =
    normalizedHashtag

  selectedHashtags.value =
    normalizedHashtag
      ? [normalizedHashtag]
      : []

  hashtagSuggestionsOpen.value = false

  await persistFilters()
  await loadViews()
}

// Limpia el filtro de hashtag
const clearHashtag =
  async (): Promise<void> => {
    hashtagSearch.value = ''
    selectedHashtags.value = []
    hashtagSuggestionsOpen.value = false

    await persistFilters()
    await loadViews()
  }

// Cambia el orden
const handleSortChange =
  async (): Promise<void> => {
    await persistFilters()
    await loadViews()
  }

// Carga inicial
onMounted(async () => {
  restoreFilters()

  await syncFiltersToUrl()

  await Promise.all([
    loadCategories(),
    loadHashtags(),
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

        <div class="hashtag-section">
          <label for="hashtag-filter">
            Hashtag
          </label>

          <div class="hashtag-combobox">
            <div class="hashtag-input-wrapper">
              <input
                id="hashtag-filter"
                v-model="hashtagSearch"
                type="text"
                :disabled="hashtagsLoading"
                placeholder="Buscar hashtag..."
                autocomplete="off"
                role="combobox"
                aria-autocomplete="list"
                :aria-expanded="
                  hashtagSuggestionsOpen &&
                  filteredHashtags.length > 0
                "
                aria-controls="hashtag-suggestions"
                @input="
                  hashtagSuggestionsOpen = true
                "
                @focus="
                  hashtagSuggestionsOpen =
                    hashtagSearch.trim().length > 0
                "
                @keydown.enter.prevent="
                  handleHashtagChange
                "
                @keydown.esc="
                  hashtagSuggestionsOpen = false
                "
              />

              <button
                v-if="hashtagSearch"
                type="button"
                class="hashtag-clear"
                aria-label="Limpiar hashtag"
                @click="clearHashtag"
              >
                ×
              </button>
            </div>

            <div
              v-if="
                hashtagSuggestionsOpen &&
                filteredHashtags.length > 0
              "
              id="hashtag-suggestions"
              class="hashtag-suggestions"
              role="listbox"
            >
              <button
                v-for="hashtag in filteredHashtags"
                :key="hashtag.id"
                type="button"
                class="hashtag-suggestion"
                role="option"
                @mousedown.prevent="
                  selectHashtag(hashtag.name)
                "
              >
                #{{ hashtag.name }}
              </button>
            </div>
          </div>

          <div
            v-if="selectedHashtags.length"
            class="active-hashtags"
          >
            <span
              v-for="hashtag in selectedHashtags"
              :key="hashtag"
              class="hashtag-chip"
            >
              #{{ hashtag }}

              <button
                type="button"
                aria-label="Quitar filtro de hashtag"
                @click="clearHashtag"
              >
                ×
              </button>
            </span>
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

      <div
        v-if="loading"
        class="state-container"
      >
        <div class="loader"></div>
        <p>Cargando publicaciones...</p>
      </div>

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
  padding: 35px 16px;
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
  max-width: 100%;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 28px;
}

.dashboard-label {
  display: inline-block;
  margin-bottom: 9px;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 2px;
}

.dashboard-header h1 {
  margin: 0 0 8px;
  color: #18181b;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -1.2px;
}

.dashboard-header p {
  max-width: 620px;
  margin: 0;
  color: #71717a;
  font-size: 16px;
  line-height: 1.65;
}

.results {
  flex-shrink: 0;
  padding: 8px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 20px;
  background: #ffffff;
  color: #71717a;
  font-size: 14px;
  font-weight: 700;
}

.dashboard-controls {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  flex-direction: column;
  gap: 20px;
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
.sort-section label,
.hashtag-section label {
  display: block;
  margin-bottom: 9px;
  color: #71717a;
  font-size: 13px;
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
  font-size: 14px;
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
  font-size: 14px;
}

/* Hashtag */

.hashtag-section {
  width: 100%;
  flex-shrink: 0;
}

.hashtag-combobox {
  position: relative;
  width: 100%;
}

.hashtag-input-wrapper {
  position: relative;
  width: 100%;
}

.hashtag-section input {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 36px 10px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  outline: none;
  background: #fafafa;
  color: #52525b;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  transition: 0.2s ease;
}

.hashtag-section input::placeholder {
  color: #a1a1aa;
}

.hashtag-section input:focus {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.08);
}

.hashtag-section input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.hashtag-clear {
  position: absolute;
  top: 50%;
  right: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #71717a;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
}

.hashtag-suggestions {
  position: absolute;
  z-index: 20;
  top: calc(100% + 5px);
  left: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
}

.hashtag-suggestion {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: #52525b;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.hashtag-suggestion:hover,
.hashtag-suggestion:focus {
  outline: none;
  background: #f5f3ff;
  color: #6d28d9;
}

.active-hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.hashtag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #ede9fe;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 700;
}

.hashtag-chip button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}

/* Ordenamiento */

.sort-section {
  width: 100%;
  flex-shrink: 0;
}

.sort-section select {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  outline: none;
  background: #fafafa;
  color: #52525b;
  font-family: inherit;
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 13px;
}

.load-more-error {
  margin: 18px 0 0;
  color: #b91c1c;
  font-size: 14px;
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
  padding: 30px 20px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
  color: #71717a;
  text-align: center;
}

.state-container strong {
  color: #27272a;
  font-size: 18px;
}

.state-container p {
  max-width: 450px;
  margin: 0;
  font-size: 15px;
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
  font-family: inherit;
  font-size: 14px;
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

/* Tablet */

@media (min-width: 701px) {
  .dashboard-page {
    padding: 45px 24px;
  }

  .dashboard-container {
    max-width: 1100px;
  }

  .dashboard-header {
    align-items: flex-end;
    flex-direction: row;
    gap: 30px;
  }

  .dashboard-header h1 {
    font-size: 36px;
  }

  .state-container {
    padding: 40px;
  }
}

/* Tablet grande / laptop */

@media (min-width: 801px) {
  .dashboard-controls {
    align-items: flex-end;
    flex-direction: row;
    gap: 25px;
  }

  .hashtag-section {
    width: 190px;
  }

  .sort-section {
    width: 190px;
  }
}

/* Escritorio */

@media (min-width: 1200px) {
  .dashboard-page {
    padding: 55px 32px;
  }

  .dashboard-container {
    max-width: 1450px;
  }
}

/* Pantallas muy grandes */

@media (min-width: 1600px) {
  .dashboard-container {
    max-width: 1500px;
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

:global(html[data-theme='dark'] .dashboard-controls) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .filter-label),
:global(html[data-theme='dark'] .sort-section label),
:global(html[data-theme='dark'] .hashtag-section label) {
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

:global(html[data-theme='dark'] .hashtag-section input) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(
  html[data-theme='dark']
    .hashtag-section input::placeholder
) {
  color: #71717a;
}

:global(html[data-theme='dark'] .hashtag-section input:focus) {
  border-color: #8b5cf6;
  background: #202033;
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.15);
}

:global(html[data-theme='dark'] .hashtag-suggestions) {
  border-color: #343447;
  background: #1b1b2d;
}

:global(html[data-theme='dark'] .hashtag-suggestion) {
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .hashtag-suggestion:hover),
:global(html[data-theme='dark'] .hashtag-suggestion:focus) {
  background: #25243a;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .hashtag-clear) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .hashtag-chip) {
  background: #2e254f;
  color: #c4b5fd;
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