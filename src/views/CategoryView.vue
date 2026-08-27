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
import {
  getHashtags,
  type Hashtag,
} from '@/services/hashtagsService'
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

// Hashtags
const hashtags = ref<Hashtag[]>([])
const hashtagsLoading = ref(false)
const hashtagSearch = ref('')
const selectedHashtag = ref('')
const hashtagSuggestionsOpen = ref(false)

// Sugerencias filtradas del hashtag
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

// Recupera los filtros desde la URL
const restoreQueryFilters = (): void => {
  const sort = route.query.sort

  if (
    sort === 'recent' ||
    sort === 'likes' ||
    sort === 'dislikes'
  ) {
    selectedSort.value = sort
  }

  const hashtag = route.query.hashtag

  if (typeof hashtag === 'string') {
    selectedHashtag.value =
      hashtag
        .trim()
        .replace(/^#/, '')
        .toLowerCase()

    hashtagSearch.value =
      selectedHashtag.value
  }
}

// Mantiene los filtros en la URL
const syncQueryFilters =
  async (): Promise<void> => {
    const query: Record<string, string> = {}

    if (selectedSort.value !== 'recent') {
      query.sort = selectedSort.value
    }

    if (selectedHashtag.value) {
      query.hashtag =
        selectedHashtag.value
    }

    await router.replace({
      query,
    })
  }

// Obtiene los datos de la categoría actual
const loadCategory =
  async (): Promise<boolean> => {
    try {
      const response =
        await getCategories()

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
        errorMessage.value =
          error.message
      } else {
        errorMessage.value =
          'No fue posible cargar la categoría.'
      }

      return false
    }
  }

// Carga hashtags disponibles
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
      hashtagsLoading.value = false
    }
  }

// Carga la primera página
const loadViews =
  async (): Promise<void> => {
    if (!categoryId.value) {
      return
    }

    loading.value = true
    errorMessage.value = ''
    loadMoreError.value = ''
    currentPage.value = 1

    try {
      const response =
        await getViews(
          {
            category:
              categoryId.value,

            hashtag:
              selectedHashtag.value ||
              undefined,

            sort:
              selectedSort.value,

            page: 1,
            limit: pageSize,
          },
          authStore.token ??
            undefined,
        )

      views.value =
        response.views

      totalViews.value =
        response.total
    } catch (error) {
      if (error instanceof Error) {
        errorMessage.value =
          error.message
      } else {
        errorMessage.value =
          'No fue posible cargar las publicaciones.'
      }
    } finally {
      loading.value = false
    }
  }

// Carga la siguiente página
const loadMoreViews =
  async (): Promise<void> => {
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
      const response =
        await getViews(
          {
            category:
              categoryId.value,

            hashtag:
              selectedHashtag.value ||
              undefined,

            sort:
              selectedSort.value,

            page:
              nextPage,

            limit:
              pageSize,
          },
          authStore.token ??
            undefined,
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

// Aplica filtro por hashtag escrito manualmente
const handleHashtagChange =
  async (): Promise<void> => {
    selectedHashtag.value =
      hashtagSearch.value
        .trim()
        .replace(/^#/, '')
        .toLowerCase()

    hashtagSearch.value =
      selectedHashtag.value

    hashtagSuggestionsOpen.value = false

    await syncQueryFilters()
    await loadViews()
  }

// Selecciona un hashtag de las sugerencias
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

  selectedHashtag.value =
    normalizedHashtag

  hashtagSuggestionsOpen.value = false

  await syncQueryFilters()
  await loadViews()
}

// Limpia filtro de hashtag
const clearHashtag =
  async (): Promise<void> => {
    hashtagSearch.value = ''
    selectedHashtag.value = ''
    hashtagSuggestionsOpen.value = false

    await syncQueryFilters()
    await loadViews()
  }

// Cambia el orden
const handleSortChange =
  async (): Promise<void> => {
    await syncQueryFilters()
    await loadViews()
  }

// Carga toda la página
const loadPage =
  async (): Promise<void> => {
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
onMounted(async () => {
  restoreQueryFilters()

  await Promise.all([
    loadHashtags(),
    loadPage(),
  ])
})

// Si cambia la categoría,
// vuelve a cargar toda la página
watch(
  () => route.params.id,
  async () => {
    selectedHashtag.value = ''
    hashtagSearch.value = ''
    hashtagSuggestionsOpen.value = false
    selectedSort.value = 'recent'

    restoreQueryFilters()

    await loadPage()
  },
)
</script>

<template>
  <AppNavbar />

  <main class="category-page">
    <section class="category-container">
      <!-- Breadcrumb -->
      <nav
        class="breadcrumbs"
        aria-label="Migas de pan"
      >
        <RouterLink to="/">
          Inicio
        </RouterLink>

        <span aria-hidden="true">
          ›
        </span>

        <RouterLink to="/#categories">
          Categorías
        </RouterLink>

        <span aria-hidden="true">
          ›
        </span>

        <span
          class="breadcrumb-current"
          aria-current="page"
        >
          {{
            category?.name ??
            'Categoría'
          }}
        </span>
      </nav>

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

      <!-- Filtros y orden -->
      <section
        v-if="category && !loading"
        class="category-controls"
        aria-label="Filtros de la categoría"
      >
        <div class="category-control-info">
          <span class="control-title">
            Publicaciones de
            {{ category.name }}
          </span>

          <span
            v-if="selectedHashtag"
            class="active-filter"
          >
            Filtrando por
            #{{ selectedHashtag }}
          </span>
        </div>

        <div class="category-filter-actions">
          <!-- Hashtag -->
          <div class="hashtag-section">
            <label for="category-hashtag">
              Hashtag
            </label>

            <div class="hashtag-combobox">
              <div class="hashtag-input-wrapper">
                <input
                  id="category-hashtag"
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
                  aria-controls="category-hashtag-suggestions"
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
                  class="clear-hashtag-button"
                  aria-label="Quitar filtro de hashtag"
                  title="Quitar filtro"
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
                id="category-hashtag-suggestions"
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
          </div>

          <!-- Orden -->
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

.category-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* Volver */

.back-button {
  margin-bottom: 28px;
  padding: 10px 14px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  color: #52525b;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.back-button:hover {
  border-color: #c4b5fd;
  color: #6d28d9;
}

/* Encabezado */

.category-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 28px;
}

.category-label {
  display: inline-block;
  margin-bottom: 9px;
  color: #6d28d9;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 2px;
}

.category-header h1 {
  margin: 0 0 8px;
  color: #18181b;
  font-size: 30px;
  line-height: 1.15;
  letter-spacing: -1.2px;
}

.category-header p {
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

/* Controles */

.category-controls {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 25px;
  padding: 18px 20px;
  border: 1px solid #e8e7ef;
  border-radius: 14px;
  background: #ffffff;
}

.control-title {
  color: #52525b;
  font-size: 14px;
  font-weight: 800;
}

.category-control-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.active-filter {
  color: #7c3aed;
  font-size: 13px;
  font-weight: 700;
}

.category-filter-actions {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 14px;
}

/* Hashtag */

.hashtag-section {
  width: 100%;
}

.hashtag-section label {
  display: block;
  margin-bottom: 8px;
  color: #71717a;
  font-size: 13px;
  font-weight: 800;
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
  padding: 10px 38px 10px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  outline: none;
  background: #fafafa;
  color: #52525b;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
}

.hashtag-section input:focus {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.08);
}

.hashtag-section input:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.clear-hashtag-button {
  position: absolute;
  top: 50%;
  right: 8px;
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0;
  transform: translateY(-50%);
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #71717a;
  font-size: 20px;
  cursor: pointer;
}

.clear-hashtag-button:hover {
  background: #ede9fe;
  color: #6d28d9;
}

.hashtag-suggestions {
  position: absolute;
  z-index: 30;
  top: calc(100% + 5px);
  left: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.12);
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

/* Orden */

.sort-section {
  width: 100%;
}

.sort-section label {
  display: block;
  margin-bottom: 8px;
  color: #71717a;
  font-size: 13px;
  font-weight: 800;
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

/* Cargar más */

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
  margin-top: 18px;
  color: #b91c1c;
  font-size: 14px;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Breadcrumb */

.breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 18px;
  color: #71717a;
  font-size: 13px;
}

.breadcrumbs a {
  color: #6d28d9;
  font-weight: 700;
  text-decoration: none;
}

.breadcrumbs a:hover {
  text-decoration: underline;
}

.breadcrumb-current {
  color: #52525b;
  font-weight: 700;
}

/* Tablet */

@media (min-width: 701px) {
  .category-page {
    padding: 45px 24px 60px;
  }

  .category-container {
    max-width: 1100px;
  }

  .category-header {
    align-items: flex-end;
    flex-direction: row;
    gap: 30px;
  }

  .category-header h1 {
    font-size: 38px;
  }

  .state-container {
    padding: 40px;
  }
}

/* Tablet grande / laptop */

@media (min-width: 760px) {
  .category-filter-actions {
    width: auto;
    min-width: 390px;
    align-items: flex-end;
    flex-direction: row;
  }

  .hashtag-section {
    width: 210px;
  }

  .category-filter-actions .sort-section {
    width: 170px;
  }
}

@media (min-width: 801px) {
  .category-controls {
    align-items: flex-end;
    flex-direction: row;
    gap: 20px;
  }
}

/* Escritorio */

@media (min-width: 1200px) {
  .category-page {
    padding: 50px 32px 70px;
  }

  .category-container {
    max-width: 1450px;
  }
}

/* Pantallas grandes */

@media (min-width: 1600px) {
  .category-container {
    max-width: 1500px;
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

:global(html[data-theme='dark'] .active-filter) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .sort-section label) {
  color: #a1a1aa;
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

:global(html[data-theme='dark'] .hashtag-section label) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .hashtag-section input) {
  border-color: #343447;
  background: #171728;
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .hashtag-section input:focus) {
  border-color: #8b5cf6;
  background: #202033;
}

:global(html[data-theme='dark'] .clear-hashtag-button) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .clear-hashtag-button:hover) {
  background: #292940;
  color: #ddd6fe;
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

:global(html[data-theme='dark'] .breadcrumbs) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .breadcrumbs a) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .breadcrumb-current) {
  color: #e4e4e7;
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