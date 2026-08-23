<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppNavbar from '@/components/AppNavbar.vue'
import type { PoliticalView } from '@/models/view'
import { getAdminViews } from '@/services/adminModerationService'
import { unpublishViewById } from '@/services/viewsService'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const views = ref<PoliticalView[]>([])
const loading = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const actionError = ref('')

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
  actionMessage.value = ''
  actionError.value = ''

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
  actionMessage.value = ''
  actionError.value = ''

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

  actionMessage.value = ''
  actionError.value = ''

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

    actionMessage.value =
      'Publicación despublicada correctamente.'

    // Recargamos desde el backend para reflejar el estado real
    await loadViews()
  } catch (error) {
    if (error instanceof Error) {
      actionError.value = error.message
    } else {
      actionError.value =
        'Ocurrió un error inesperado.'
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

        <p
          v-if="actionMessage"
          class="message success-message"
        >
          {{ actionMessage }}
        </p>

        <p
          v-if="actionError"
          class="message error-message"
        >
          {{ actionError }}
        </p>

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
.admin-page {
  min-height: 100vh;
  padding: 40px 24px 70px;
  background: #f7f7fb;
}

.admin-container {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.eyebrow {
  display: block;
  margin-bottom: 7px;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.admin-header h1 {
  margin: 0;
  color: #18181b;
  font-size: 30px;
}

.admin-header p {
  margin: 8px 0 0;
  color: #71717a;
  font-size: 14px;
}

.total-card {
  min-width: 110px;
  padding: 15px 20px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
  text-align: center;
}

.total-card strong {
  display: block;
  color: #7c3aed;
  font-size: 25px;
}

.total-card span {
  color: #71717a;
  font-size: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns:
    repeat(3, 1fr);
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
  font-size: 24px;
}

.stat-card span {
  color: #71717a;
  font-size: 12px;
}

.admin-panel {
  padding: 24px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

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
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.filters button.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  color: #6d28d9;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 12px 10px;
  border-bottom: 1px solid #e4e4e7;
  color: #71717a;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
}

td {
  padding: 15px 10px;
  border-bottom: 1px solid #f1f1f4;
  color: #52525b;
  font-size: 13px;
}

.view-cell {
  display: flex;
  min-width: 180px;
  flex-direction: column;
  gap: 4px;
}

.view-cell strong {
  color: #27272a;
}

.view-cell small {
  max-width: 230px;
  overflow: hidden;
  color: #a1a1aa;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 11px;
  font-weight: 700;
}

.status-badge.unpublished {
  background: #fee2e2;
  color: #991b1b;
}

.reaction-count {
  display: inline-flex;
  min-width: 30px;
  justify-content: center;
  padding: 5px 8px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  font-size: 11px;
  font-weight: 700;
}

.actions-heading,
.actions-cell {
  text-align: right;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
}

.primary-button,
.secondary-button,
.danger-button,
.pagination button {
  padding: 9px 12px;
  border-radius: 8px;
  font: inherit;
  font-size: 12px;
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

.message {
  margin: 0 0 18px;
  padding: 11px 13px;
  border-radius: 8px;
  font-size: 13px;
}

.success-message {
  background: #f0fdf4;
  color: #166534;
}

.error-message {
  background: #fef2f2;
  color: #991b1b;
}

.state-container {
  padding: 55px 20px;
  color: #71717a;
  text-align: center;
}

.state-container strong {
  color: #27272a;
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

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 20px;
  color: #71717a;
  font-size: 13px;
}

.pagination-actions {
  display: flex;
  gap: 8px;
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

/* Tema oscuro */

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

/* Responsive */

@media (max-width: 700px) {
  .admin-page {
    padding: 28px 14px 50px;
  }

  .admin-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .pagination-actions {
    width: 100%;
  }

  .pagination-actions button {
    flex: 1;
  }
}
</style>