<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import AppNavbar from '@/components/AppNavbar.vue'
import type { Category } from '@/models/category'
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from '@/services/adminCategoriesService'
import { useAuthStore } from '@/stores/auth'
import { getViews } from '@/services/viewsService'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const toastStore = useToastStore()
const categories = ref<Category[]>([])
const publicationCounts =
  ref<Record<string, number | null>>({})
const loading = ref(false)
const errorMessage = ref('')

const search = ref('')

type CategoryFilter =
  | 'all'
  | 'active'
  | 'deleted'

const statusFilter =
  ref<CategoryFilter>('all')

const modalOpen = ref(false)
const editingCategory = ref<Category | null>(null)
const categoryName = ref('')
const formError = ref('')
const saving = ref(false)

const actionCategoryId = ref<string | null>(null)

const filteredCategories = computed(() => {
  const query = search.value
    .trim()
    .toLocaleLowerCase('es')

  return categories.value.filter((category) => {
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'active' &&
        !category.deletedAt) ||
      (statusFilter.value === 'deleted' &&
        Boolean(category.deletedAt))

    const matchesSearch =
      !query ||
      category.name
        .toLocaleLowerCase('es')
        .includes(query)

    return matchesStatus && matchesSearch
  })
})

const activeCategories = computed(() => {
  return categories.value.filter(
    (category) => !category.deletedAt,
  ).length
})

const deletedCategories = computed(() => {
  return categories.value.filter(
    (category) => Boolean(category.deletedAt),
  ).length
})

const loadCategories = async (): Promise<void> => {
  if (!authStore.token) {
    errorMessage.value =
      'Debes iniciar sesión para acceder a esta sección.'
    return
  }

  const token = authStore.token

  loading.value = true
  errorMessage.value = ''

  try {
    const response =
      await getAdminCategories(token)

    categories.value = response.categories

    const counts = await Promise.all(
      response.categories.map(
        async (category) => {
          try {
            const viewsResponse =
              await getViews(
                {
                  category: category.id,
                  page: 1,
                  limit: 1,
                },
                token,
              )

            return [
              category.id,
              viewsResponse.total,
            ] as const
          } catch {
            return [
              category.id,
              null,
            ] as const
          }
        },
      ),
    )

    publicationCounts.value =
      Object.fromEntries(counts)
  } catch (error) {
    categories.value = []
    publicationCounts.value = {}

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

const clearSearch = (): void => {
  search.value = ''
}

const openCreateModal = (): void => {
  editingCategory.value = null
  categoryName.value = ''
  formError.value = ''
  modalOpen.value = true
}

const openEditModal = (
  category: Category,
): void => {
  if (category.deletedAt) {
    return
  }

  editingCategory.value = category
  categoryName.value = category.name
  formError.value = ''
  modalOpen.value = true
}

const closeModal = (): void => {
  if (saving.value) {
    return
  }

  modalOpen.value = false
  editingCategory.value = null
  categoryName.value = ''
  formError.value = ''
}

const saveCategory = async (): Promise<void> => {
  if (!authStore.token || saving.value) {
    return
  }

  const name = categoryName.value.trim()

  formError.value = ''

  if (!name) {
    formError.value =
      'El nombre de la categoría es obligatorio.'
    return
  }

  saving.value = true

  try {
    if (editingCategory.value) {
      await updateAdminCategory(
        editingCategory.value.id,
        name,
        authStore.token,
      )

      toastStore.success(
        'Categoría actualizada correctamente.'
      )
    } else {
      await createAdminCategory(
        name,
        authStore.token,
      )

      toastStore.success(
        'Categoría creada correctamente.'
      )
    }

    modalOpen.value = false
    editingCategory.value = null
    categoryName.value = ''

    await loadCategories()
  } catch (error) {
    if (error instanceof Error) {
      formError.value = error.message
    } else {
      formError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    saving.value = false
  }
}

const removeCategory = async (
  category: Category,
): Promise<void> => {
  if (
    !authStore.token ||
    actionCategoryId.value ||
    category.deletedAt
  ) {
    return
  }

  const confirmed = window.confirm(
    `¿Deseas eliminar la categoría "${category.name}"?`,
  )

  if (!confirmed) {
    return
  }

  actionCategoryId.value = category.id

  try {
    await deleteAdminCategory(
      category.id,
      authStore.token,
    )

    toastStore.success(
      'Categoría eliminada correctamente.'
    )
    await loadCategories()
  } catch (error) {
    if (error instanceof Error) {
      toastStore.error(error.message)
    } else {
      toastStore.error(
        'Ocurrió un error inesperado.',
      )
    }
  } finally {
  actionCategoryId.value = null
  }
}

onMounted(loadCategories)
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

          <h1>Gestión de categorías</h1>

          <p>
            Crea, edita y administra las categorías
            disponibles en la plataforma.
          </p>
        </div>

        <button
          type="button"
          class="create-button"
          @click="openCreateModal"
        >
          <span>+</span>
          Nueva categoría
        </button>
      </header>

      <section class="stats-grid">
        <article class="stat-card">
          <strong>{{ categories.length }}</strong>
          <span>Total</span>
        </article>

        <article class="stat-card">
          <strong>{{ activeCategories }}</strong>
          <span>Activas</span>
        </article>

        <article class="stat-card">
          <strong>{{ deletedCategories }}</strong>
          <span>Eliminadas</span>
        </article>
      </section>

      <section class="admin-panel">
        <div
        class="filter-tabs"
        aria-label="Filtrar categorías por estado"
        >
        <button
            type="button"
            :class="{
            active: statusFilter === 'all',
            }"
            @click="statusFilter = 'all'"
        >
            Todas
            <span>{{ categories.length }}</span>
        </button>

        <button
            type="button"
            :class="{
            active: statusFilter === 'active',
            }"
            @click="statusFilter = 'active'"
        >
            Activas
            <span>{{ activeCategories }}</span>
        </button>

        <button
            type="button"
            :class="{
            active: statusFilter === 'deleted',
            }"
            @click="statusFilter = 'deleted'"
        >
            Eliminadas
            <span>{{ deletedCategories }}</span>
        </button>
        </div>
        <div class="toolbar">
          <input
            v-model="search"
            type="search"
            placeholder="Buscar categoría..."
            aria-label="Buscar categorías"
          />

          <button
            v-if="search"
            type="button"
            class="secondary-button"
            @click="clearSearch"
          >
            Limpiar
          </button>
        </div>

        <div
          v-if="loading"
          class="state-container"
        >
          <span class="loader"></span>
          <p>Cargando categorías...</p>
        </div>

        <div
          v-else-if="errorMessage"
          class="state-container"
        >
          <strong>
            No fue posible cargar las categorías.
          </strong>

          <p>{{ errorMessage }}</p>

          <button
            type="button"
            class="primary-button"
            @click="loadCategories"
          >
            Intentar nuevamente
          </button>
        </div>

        <div
          v-else-if="
            filteredCategories.length === 0
          "
          class="state-container"
        >
          <strong>
            No encontramos categorías.
          </strong>

          <p>
            Intenta realizar otra búsqueda.
          </p>
        </div>

        <div
          v-else
          class="table-wrapper"
        >
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Publicaciones</th>
                <th>Estado</th>

                <th class="actions-heading">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="
                  category in filteredCategories
                "
                :key="category.id"
              >
                <td>
                  <div class="category-cell">
                    <span class="category-icon">
                      #
                    </span>

                    <strong>
                      {{ category.name }}
                    </strong>
                  </div>
                </td>

                <td>
                    <span class="publication-count">
                        {{
                        publicationCounts[category.id] ??
                        '—'
                        }}
                    </span>
                </td>

                <td>
                  <span
                    class="status-badge"
                    :class="{
                      deleted:
                        Boolean(
                          category.deletedAt,
                        ),
                    }"
                  >
                    {{
                      category.deletedAt
                        ? 'Eliminada'
                        : 'Activa'
                    }}
                  </span>
                </td>

                <td class="actions-cell">
                  <template
                    v-if="!category.deletedAt"
                  >
                    <button
                      type="button"
                      class="edit-button"
                      :disabled="
                        actionCategoryId ===
                        category.id
                      "
                      @click="
                        openEditModal(category)
                      "
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      class="delete-button"
                      :disabled="
                        actionCategoryId ===
                        category.id
                      "
                      @click="
                        removeCategory(category)
                      "
                    >
                      {{
                        actionCategoryId ===
                        category.id
                          ? 'Eliminando...'
                          : 'Eliminar'
                      }}
                    </button>
                  </template>

                  <span
                    v-else
                    class="deleted-label"
                  >
                    Sin acciones
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div
      v-if="modalOpen"
      class="modal-backdrop"
      @click.self="closeModal"
    >
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="
          editingCategory
            ? 'Editar categoría'
            : 'Crear categoría'
        "
      >
        <header class="modal-header">
          <div>
            <span class="eyebrow">
              {{
                editingCategory
                  ? 'EDITAR'
                  : 'NUEVA'
              }}
            </span>

            <h2>
              {{
                editingCategory
                  ? 'Editar categoría'
                  : 'Crear categoría'
              }}
            </h2>
          </div>

          <button
            type="button"
            class="close-button"
            aria-label="Cerrar"
            :disabled="saving"
            @click="closeModal"
          >
            ×
          </button>
        </header>

        <form @submit.prevent="saveCategory">
          <label for="category-name">
            Nombre
          </label>

          <input
            id="category-name"
            v-model="categoryName"
            type="text"
            maxlength="100"
            autocomplete="off"
            placeholder="Ej. Economía"
            autofocus
          />

          <p
            v-if="formError"
            class="form-error"
          >
            {{ formError }}
          </p>

          <footer class="modal-actions">
            <button
              type="button"
              class="secondary-button"
              :disabled="saving"
              @click="closeModal"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="primary-button"
              :disabled="saving"
            >
              {{
                saving
                  ? 'Guardando...'
                  : editingCategory
                    ? 'Guardar cambios'
                    : 'Crear categoría'
              }}
            </button>
          </footer>
        </form>
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
  padding: 28px 16px 50px;
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
  align-items: stretch;
  justify-content: space-between;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 22px;
}

.eyebrow {
  display: block;
  margin-bottom: 7px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.admin-header h1,
.modal-header h2 {
  margin: 0;
  color: #18181b;
}

.admin-header h1 {
  font-size: 30px;
  line-height: 1.2;
}

.admin-header p {
  margin: 8px 0 0;
  color: #71717a;
  font-size: 15px;
  line-height: 1.6;
}

.create-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 11px 16px;
  border: 1px solid #7c3aed;
  border-radius: 9px;
  background: #7c3aed;
  color: #ffffff;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.create-button span {
  font-size: 19px;
  line-height: 1;
}

/* =========================
   ESTADÍSTICAS
   ========================= */

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
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
  margin-bottom: 3px;
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
  padding: 16px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

/* =========================
   FILTROS
   ========================= */

.filter-tabs {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.filter-tabs button {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 8px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  color: #71717a;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.filter-tabs button span {
  min-width: 21px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #71717a;
  font-size: 12px;
  text-align: center;
}

.filter-tabs button:hover {
  border-color: #c4b5fd;
  color: #6d28d9;
}

.filter-tabs button.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  color: #6d28d9;
}

.filter-tabs button.active span {
  background: #ede9fe;
  color: #6d28d9;
}

/* =========================
   BÚSQUEDA
   ========================= */

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 22px;
}

.toolbar input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 12px 13px;
  border: 1px solid #d4d4d8;
  border-radius: 9px;
  background: #ffffff;
  color: #18181b;
  font: inherit;
  font-size: 14px;
}

.toolbar input:focus,
.modal input:focus {
  border-color: #7c3aed;
  outline: 2px solid #ede9fe;
}

.primary-button,
.secondary-button,
.edit-button,
.delete-button {
  padding: 10px 14px;
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
  min-width: 780px;
  border-collapse: collapse;
  table-layout: fixed;
}

th:nth-child(1) {
  text-align: center;
}

td:nth-child(1) {
  text-align: left;
}

th:nth-child(2),
td:nth-child(2) {
  width: 18%;
  text-align: center;
}

th:nth-child(3),
td:nth-child(3) {
  width: 18%;
  text-align: center;
}

th:nth-child(4),
td:nth-child(4) {
  width: 32%;
  text-align: center;
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

.category-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #27272a;
}

.category-icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 9px;
  background: #ede9fe;
  color: #6d28d9;
  font-size: 14px;
  font-weight: 900;
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

.status-badge.deleted {
  background: #f4f4f5;
  color: #71717a;
}

.actions-heading,
.actions-cell {
  text-align: center;
}

.actions-cell {
  white-space: nowrap;
}

.edit-button {
  margin-right: 7px;
  border: 1px solid #ddd6fe;
  background: #f5f3ff;
  color: #6d28d9;
}

.delete-button {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.edit-button:disabled,
.delete-button:disabled,
.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.deleted-label {
  color: #a1a1aa;
  font-size: 13px;
}

.publication-count {
  display: inline-flex;
  min-width: 30px;
  justify-content: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  font-size: 12px;
  font-weight: 700;
}

/* =========================
   ERRORES Y ESTADOS
   ========================= */

.form-error {
  margin: 9px 0 0;
  color: #991b1b;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.error-message {
  background: #fef2f2;
}

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
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================
   MODAL
   ========================= */

.modal-backdrop {
  position: fixed;
  z-index: 500;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 16, 32, 0.48);
}

.modal {
  box-sizing: border-box;
  width: 100%;
  max-width: 440px;
  padding: 20px;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  background: #ffffff;
  box-shadow:
    0 22px 60px rgba(15, 16, 32, 0.2);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.modal-header h2 {
  font-size: 22px;
}

.close-button {
  border: none;
  background: transparent;
  color: #71717a;
  font-size: 24px;
  cursor: pointer;
}

.modal label {
  display: block;
  margin-bottom: 7px;
  color: #3f3f46;
  font-size: 14px;
  font-weight: 700;
}

.modal input {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 13px;
  border: 1px solid #d4d4d8;
  border-radius: 9px;
  background: #ffffff;
  color: #18181b;
  font: inherit;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  flex-direction: column-reverse;
  gap: 9px;
  margin-top: 22px;
}

.modal-actions button {
  width: 100%;
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

  .create-button {
    width: auto;
  }

  .stats-grid {
    grid-template-columns:
      repeat(3, 1fr);
  }

  .admin-panel {
    padding: 24px;
  }

  .toolbar {
    flex-direction: row;
  }

  .toolbar input {
    flex: 1;
  }

  .modal {
    padding: 22px;
  }

  .modal-actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .modal-actions button {
    width: auto;
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
:global(html[data-theme='dark'] .modal-header h2),
:global(html[data-theme='dark'] .category-cell),
:global(html[data-theme='dark'] .state-container strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .admin-header p),
:global(html[data-theme='dark'] .stat-card span),
:global(html[data-theme='dark'] td),
:global(html[data-theme='dark'] th) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .stat-card),
:global(html[data-theme='dark'] .admin-panel),
:global(html[data-theme='dark'] .modal) {
  border-color: #343447;
  background: #1b1b2d;
}

:global(html[data-theme='dark'] .toolbar input),
:global(html[data-theme='dark'] .modal input) {
  border-color: #343447;
  background: #151526;
  color: #f4f4f5;
}

:global(html[data-theme='dark'] th) {
  border-bottom-color: #343447;
}

:global(html[data-theme='dark'] td) {
  border-bottom-color: #29293d;
}

:global(html[data-theme='dark'] .secondary-button) {
  border-color: #343447;
  background: #252538;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .category-icon) {
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .modal label) {
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .filter-tabs button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .filter-tabs button span) {
  background: #29293d;
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .filter-tabs button:hover),
:global(html[data-theme='dark'] .filter-tabs button.active) {
  border-color: #7c3aed;
  background: #29243f;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .filter-tabs button.active span) {
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .publication-count) {
  background: #29293d;
  color: #d4d4d8;
}
</style>