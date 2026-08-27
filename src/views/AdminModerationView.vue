<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppNavbar from '@/components/AppNavbar.vue'
import type { PoliticalView } from '@/models/view'

import {
  getAdminViews,
  publishAdminView,
} from '@/services/adminModerationService'

import { unpublishViewById } from '@/services/viewsService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const router = useRouter()
const toastStore = useToastStore()

const views = ref<PoliticalView[]>([])
const loading = ref(false)
const errorMessage = ref('')

const selectedStatus = ref<
  'ALL' | 'PUBLISHED' | 'UNPUBLISHED'
>('ALL')

const currentPage = ref(1)
const limit = 20
const total = ref(0)

const actionViewId = ref<string | null>(null)

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(total.value / limit))
})

const publishedCount = computed(() => {
  return views.value.filter(
    (view) => view.status === 'PUBLISHED',
  ).length
})

const unpublishedCount = computed(() => {
  return views.value.filter(
    (view) => view.status === 'UNPUBLISHED',
  ).length
})

const loadViews = async (): Promise<void> => {
  if (!authStore.token) {
    errorMessage.value =
      'Debes iniciar sesión para acceder a esta sección.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getAdminViews(
      authStore.token,
      {
        status:
          selectedStatus.value === 'ALL'
            ? undefined
            : selectedStatus.value,
        page: currentPage.value,
        limit,
      },
    )

    views.value = response.views
    total.value = response.total
    currentPage.value = response.page
  } catch (error) {
    views.value = []
    total.value = 0

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

const changeStatus = async (
  status: 'ALL' | 'PUBLISHED' | 'UNPUBLISHED',
): Promise<void> => {
  if (selectedStatus.value === status) {
    return
  }

  selectedStatus.value = status
  currentPage.value = 1

  await loadViews()
}

const changePage = async (
  page: number,
): Promise<void> => {
  if (
    page < 1 ||
    page > totalPages.value ||
    page === currentPage.value
  ) {
    return
  }

  currentPage.value = page

  await loadViews()
}

const openView = (
  viewId: string,
): void => {
  router.push({
    name: 'view-detail',
    params: {
      id: viewId,
    },
  })
}

const unpublishView = async (
  view: PoliticalView,
): Promise<void> => {
  if (
    !authStore.token ||
    actionViewId.value ||
    view.status !== 'PUBLISHED'
  ) {
    return
  }

  const title =
    view.sides?.[0]?.title ??
    'esta publicación'

  const confirmed = window.confirm(
    `¿Deseas despublicar "${title}"?`,
  )

  if (!confirmed) {
    return
  }

  actionViewId.value = view.id

  try {
    await unpublishViewById(
      view.id,
      authStore.token,
    )

    toastStore.success(
      'Publicación despublicada correctamente.'
    )

    // Recargamos desde el backend para reflejar el estado real
    await loadViews()
  } catch (error) {
    if (error instanceof Error) {
      toastStore.error(error.message)
    } else {
      toastStore.error(
        'Ocurrió un error inesperado.',
      )
    }
  } finally {
    actionViewId.value = null
  }
}

// Republicar
const publishView = async (
  view: PoliticalView,
): Promise<void> => {
  if (
    !authStore.token ||
    actionViewId.value ||
    view.status !== 'UNPUBLISHED'
  ) {
    return
  }

  const title =
    view.sides?.[0]?.title ??
    'esta publicación'

  const confirmed = window.confirm(
    `¿Deseas republicar "${title}"?`,
  )

  if (!confirmed) {
    return
  }

  actionViewId.value = view.id

  try {
    await publishAdminView(
      view.id,
      authStore.token,
    )

    toastStore.success(
      'Publicación republicada correctamente.'
    )

    await loadViews()
  } catch (error) {
    if (error instanceof Error) {
      toastStore.error(error.message)
    } else {
      toastStore.error(
        'Ocurrió un error inesperado.',
      )
    }
  } finally {
    actionViewId.value = null
  }
}

const formatDate = (
  date: string,
): string => {
  return new Intl.DateTimeFormat(
    'es-CR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(
    new Date(date),
  )
}

const getViewTitle = (
  view: PoliticalView,
): string => {
  return (
    view.sides?.[0]?.title ??
    'Sin título'
  )
}

onMounted(loadViews)
</script>

<template>
  <AppNavbar />

  <main class="admin-page">
    <div class="admin-container">
      <header class="admin-header">
        <div>
          <span class="eyebrow">
            ADMINISTRACIÓN
          </span>

          <h1>
            Moderación de contenido
          </h1>

          <p>
            Revisa y administra las publicaciones
            disponibles en la plataforma.
          </p>
        </div>

        <div class="total-card">
          <strong>
            {{ total }}
          </strong>

          <span>
            publicaciones
          </span>
        </div>
      </header>

      <section class="stats-grid">
        <article class="stat-card">
          <strong>
            {{ total }}
          </strong>

          <span>
            Total
          </span>
        </article>

        <article class="stat-card">
          <strong>
            {{ publishedCount }}
          </strong>

          <span>
            Publicadas
          </span>
        </article>

        <article class="stat-card">
          <strong>
            {{ unpublishedCount }}
          </strong>

          <span>
            Despublicadas
          </span>
        </article>
      </section>

      <section class="admin-panel">
        <div class="filters">
          <button
            type="button"
            :class="{
              active:
                selectedStatus === 'ALL',
            }"
            @click="changeStatus('ALL')"
          >
            Todas
          </button>

          <button
            type="button"
            :class="{
              active:
                selectedStatus ===
                'PUBLISHED',
            }"
            @click="
              changeStatus('PUBLISHED')
            "
          >
            Publicadas
          </button>

          <button
            type="button"
            :class="{
              active:
                selectedStatus ===
                'UNPUBLISHED',
            }"
            @click="
              changeStatus('UNPUBLISHED')
            "
          >
            Despublicadas
          </button>
        </div>

        <div
          v-if="loading"
          class="state-container"
        >
          <span class="loader"></span>

          <p>
            Cargando publicaciones...
          </p>
        </div>

        <div
          v-else-if="errorMessage"
          class="state-container"
        >
          <strong>
            No fue posible cargar las publicaciones.
          </strong>

          <p>
            {{ errorMessage }}
          </p>

          <button
            type="button"
            class="primary-button"
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
            No hay publicaciones.
          </strong>

          <p>
            No existen publicaciones con
            este estado.
          </p>
        </div>

        <template v-else>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    Publicación
                  </th>

                  <th>
                    Autor
                  </th>

                  <th>
                    Categoría
                  </th>

                  <th>
                    Estado
                  </th>

                  <th>
                    Likes
                    </th>

                  <th>
                    Dislikes
                  </th>

                  <th>
                    Fecha
                  </th>

                  <th class="actions-heading">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="view in views"
                  :key="view.id"
                >
                  <td>
                    <div class="view-cell">
                      <strong>
                        {{ getViewTitle(view) }}
                      </strong>

                      <small>
                        {{
                          view.sides?.[1]?.title ??
                          'Sin contraparte'
                        }}
                      </small>
                    </div>
                  </td>

                  <td>
                    {{ view.author.name }}
                  </td>

                  <td>
                    {{ view.category.name }}
                  </td>

                  <td>
                    <span
                      class="status-badge"
                      :class="{
                        unpublished:
                          view.status ===
                          'UNPUBLISHED',
                      }"
                    >
                      {{
                        view.status ===
                        'PUBLISHED'
                          ? 'Publicada'
                          : 'Despublicada'
                      }}
                    </span>
                  </td>

                  <td>
                    <span class="reaction-count">
                        {{ view.totalLikes }}
                    </span>
                    </td>

                    <td>
                    <span class="reaction-count">
                        {{ view.totalDislikes }}
                    </span>
                  </td>

                  <td>
                    {{ formatDate(view.createdAt) }}
                  </td>

                  <td class="actions-cell">
                    <div class="action-buttons">
                      <button
                        type="button"
                        class="secondary-button"
                        @click="openView(view.id)"
                      >
                        Ver
                      </button>

                      <button
                        v-if="
                          view.status ===
                          'PUBLISHED'
                        "
                        type="button"
                        class="danger-button"
                        :disabled="
                          actionViewId ===
                          view.id
                        "
                        @click="
                          unpublishView(view)
                        "
                      >
                        {{
                          actionViewId ===
                          view.id
                            ? 'Procesando...'
                            : 'Despublicar'
                        }}
                      </button>

                      <button
                        v-if="
                          view.status ===
                          'UNPUBLISHED'
                        "
                        type="button"
                        class="primary-button"
                        :disabled="
                          actionViewId ===
                          view.id
                        "
                        @click="
                          publishView(view)
                        "
                      >
                        {{
                          actionViewId ===
                          view.id
                            ? 'Procesando...'
                            : 'Republicar'
                        }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="pagination">
            <span>
              Página
              <strong>
                {{ currentPage }}
              </strong>
              de
              <strong>
                {{ totalPages }}
              </strong>
            </span>

            <div class="pagination-actions">
              <button
                type="button"
                :disabled="
                  currentPage <= 1
                "
                @click="
                  changePage(
                    currentPage - 1,
                  )
                "
              >
                Anterior
              </button>

              <button
                type="button"
                :disabled="
                  currentPage >=
                  totalPages
                "
                @click="
                  changePage(
                    currentPage + 1,
                  )
                "
              >
                Siguiente
              </button>
            </div>
          </footer>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* =========================
   MOBILE FIRST
   Base: móvil
   ========================= */

.admin-page {
  min-height: 100vh;
  padding: 28px 14px 50px;
  background: #f7f7fb;
}

.admin-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* =========================
   ENCABEZADO
   ========================= */

.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 24px;
}

.eyebrow {
  display: block;
  margin-bottom: 7px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.admin-header h1 {
  margin: 0;
  color: #18181b;
  font-size: 30px;
  line-height: 1.2;
}

.admin-header p {
  margin: 8px 0 0;
  color: #71717a;
  font-size: 15px;
  line-height: 1.6;
}

.total-card {
  box-sizing: border-box;
  width: 100%;
  padding: 15px 20px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  text-align: center;
}

.total-card strong {
  display: block;
  color: #7c3aed;
  font-size: 27px;
}

.total-card span {
  color: #71717a;
  font-size: 13px;
}

/* =========================
   ESTADÍSTICAS
   ========================= */

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 18px;
}

.stat-card {
  padding: 18px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
}

.stat-card strong {
  display: block;
  color: #7c3aed;
  font-size: 26px;
}

.stat-card span {
  color: #71717a;
  font-size: 13px;
}

/* =========================
   PANEL
   ========================= */

.admin-panel {
  padding: 18px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

/* =========================
   FILTROS
   ========================= */

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 22px;
}

.filters button {
  padding: 8px 13px;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  background: #ffffff;
  color: #52525b;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.filters button.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  color: #6d28d9;
}

/* =========================
   TABLA
   ========================= */

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

th {
  padding: 12px 10px;
  border-bottom: 1px solid #e4e4e7;
  color: #71717a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
}

td {
  padding: 15px 10px;
  border-bottom: 1px solid #f1f1f4;
  color: #52525b;
  font-size: 14px;
}

.view-cell {
  display: flex;
  min-width: 200px;
  flex-direction: column;
  gap: 4px;
}

.view-cell strong {
  color: #27272a;
  font-size: 14px;
}

.view-cell small {
  max-width: 230px;
  overflow: hidden;
  color: #a1a1aa;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 700;
}

.status-badge.unpublished {
  background: #fee2e2;
  color: #991b1b;
}

.reaction-count {
  display: inline-flex;
  min-width: 32px;
  justify-content: center;
  padding: 5px 8px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  font-size: 12px;
  font-weight: 700;
}

.actions-heading,
.actions-cell {
  text-align: right;
}

.action-buttons {
  display: grid;
  grid-template-columns: 72px 110px;
  justify-content: end;
  gap: 7px;
}

.action-buttons .secondary-button,
.action-buttons .primary-button,
.action-buttons .danger-button {
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

.primary-button,
.secondary-button,
.danger-button,
.pagination button {
  padding: 9px 12px;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  border: 1px solid #7c3aed;
  background: #7c3aed;
  color: #ffffff;
}

.secondary-button {
  border: 1px solid #d4d4d8;
  background: #ffffff;
  color: #52525b;
}

.danger-button {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.danger-button:disabled,
.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* =========================
   ESTADOS
   ========================= */

.state-container {
  padding: 45px 18px;
  color: #71717a;
  font-size: 14px;
  text-align: center;
}

.state-container strong {
  color: #27272a;
  font-size: 17px;
}

.loader {
  display: inline-block;
  width: 25px;
  height: 25px;
  border: 3px solid #ddd6fe;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* =========================
   PAGINACIÓN
   ========================= */

.pagination {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  flex-direction: column;
  gap: 14px;
  padding-top: 20px;
  color: #71717a;
  font-size: 14px;
}

.pagination-actions {
  display: flex;
  width: 100%;
  gap: 8px;
}

.pagination-actions button {
  flex: 1;
}

.pagination button {
  border: 1px solid #d4d4d8;
  background: #ffffff;
  color: #52525b;
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
  .admin-page {
    padding: 40px 24px 70px;
  }

  .admin-container {
    max-width: 1180px;
  }

  .admin-header {
    align-items: center;
    flex-direction: row;
    gap: 24px;
  }

  .admin-header h1 {
    font-size: 32px;
  }

  .total-card {
    width: auto;
    min-width: 120px;
  }

  .stats-grid {
    grid-template-columns:
      repeat(3, 1fr);
  }

  .admin-panel {
    padding: 24px;
  }

  .pagination {
    align-items: center;
    flex-direction: row;
    gap: 18px;
  }

  .pagination-actions {
    width: auto;
  }

  .pagination-actions button {
    flex: initial;
  }
}

/* =========================
   ESCRITORIO
   ========================= */

@media (min-width: 1200px) {
  .admin-page {
    padding: 50px 32px 80px;
  }

  .admin-container {
    max-width: 1450px;
  }
}

/* =========================
   PANTALLAS GRANDES
   ========================= */

@media (min-width: 1600px) {
  .admin-container {
    max-width: 1500px;
  }
}

/* =========================
   TEMA OSCURO
   ========================= */

:global(html[data-theme='dark'] .admin-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .admin-header h1),
:global(html[data-theme='dark'] .view-cell strong),
:global(html[data-theme='dark'] .state-container strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .admin-header p),
:global(html[data-theme='dark'] td),
:global(html[data-theme='dark'] .pagination) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .admin-panel),
:global(html[data-theme='dark'] .total-card),
:global(html[data-theme='dark'] .stat-card) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] th),
:global(html[data-theme='dark'] td) {
  border-bottom-color: #29293d;
}

:global(html[data-theme='dark'] .filters button),
:global(html[data-theme='dark'] .secondary-button),
:global(html[data-theme='dark'] .pagination button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .filters button.active) {
  border-color: #8b5cf6;
  background: #2e2448;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .reaction-count) {
  background: #24243a;
  color: #d4d4d8;
}
</style>