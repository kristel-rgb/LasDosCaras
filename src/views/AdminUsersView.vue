<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppNavbar from '@/components/AppNavbar.vue'
import type { AdminUser } from '@/models/adminUser'
import {
  banAdminUser,
  getAdminUsers,
  unbanAdminUser,
} from '@/services/adminUsersService'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const toastStore = useToastStore()
const users = ref<AdminUser[]>([])
const loading = ref(false)
const errorMessage = ref('')

const search = ref('')
const currentPage = ref(1)
const limit = 20
const total = ref(0)

const actionUserId = ref<string | null>(null)

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(total.value / limit))
})

const loadUsers = async (): Promise<void> => {
  if (!authStore.token) {
    errorMessage.value =
      'Debes iniciar sesión para acceder a esta sección.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getAdminUsers(
      authStore.token,
      {
        search: search.value,
        page: currentPage.value,
        limit,
      },
    )

    users.value = response.users
    total.value = response.total
    currentPage.value = response.page
  } catch (error) {
    users.value = []
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

const submitSearch = async (): Promise<void> => {
  currentPage.value = 1
  await loadUsers()
}

const clearSearch = async (): Promise<void> => {
  search.value = ''
  currentPage.value = 1
  await loadUsers()
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
  await loadUsers()
}

const toggleUserStatus = async (
  user: AdminUser,
): Promise<void> => {
  if (!authStore.token || actionUserId.value) {
    return
  }

  const isSuspended =
    user.status === 'SUSPENDED'

  const confirmed = window.confirm(
    isSuspended
      ? `¿Deseas reactivar a ${user.name}?`
      : `¿Deseas suspender a ${user.name}?`,
  )

  if (!confirmed) {
    return
  }

  actionUserId.value = user.id

  try {
    const updatedUser = isSuspended
      ? await unbanAdminUser(
          user.id,
          authStore.token,
        )
      : await banAdminUser(
          user.id,
          authStore.token,
        )

    users.value = users.value.map(
      (currentUser) =>
        currentUser.id === updatedUser.id
          ? updatedUser
          : currentUser,
    )

    toastStore.success(
      isSuspended
      ? 'Usuario reactivado correctamente.'
      : 'Usuario suspendido correctamente.',
    )
  } catch (error) {
    if (error instanceof Error) {
      toastStore.error(error.message)
    } else {
      toastStore.error(
        'Ocurrió un error inesperado.',
      )
    }
  } finally {
    actionUserId.value = null
  }
}

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

onMounted(loadUsers)
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

          <h1>Gestión de usuarios</h1>

          <p>
            Consulta, busca, suspende y reactiva
            usuarios registrados.
          </p>
        </div>

        <div class="total-card">
          <strong>{{ total }}</strong>
          <span>usuarios</span>
        </div>
      </header>

      <section class="admin-panel">
        <form
          class="search-form"
          @submit.prevent="submitSearch"
        >
          <input
            v-model="search"
            type="search"
            placeholder="Buscar por nombre o correo..."
            aria-label="Buscar usuarios"
          />

          <button
            type="submit"
            class="primary-button"
          >
            Buscar
          </button>

          <button
            v-if="search"
            type="button"
            class="secondary-button"
            @click="clearSearch"
          >
            Limpiar
          </button>
        </form>

        <div
          v-if="loading"
          class="state-container"
        >
          <span class="loader"></span>
          <p>Cargando usuarios...</p>
        </div>

        <div
          v-else-if="errorMessage"
          class="state-container"
        >
          <strong>
            No fue posible cargar los usuarios.
          </strong>

          <p>{{ errorMessage }}</p>

          <button
            type="button"
            class="primary-button"
            @click="loadUsers"
          >
            Intentar nuevamente
          </button>
        </div>

        <div
          v-else-if="users.length === 0"
          class="state-container"
        >
          <strong>
            No encontramos usuarios.
          </strong>

          <p>
            Intenta realizar otra búsqueda.
          </p>
        </div>

        <template v-else>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th class="actions-heading">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="user in users"
                  :key="user.id"
                >
                  <td>
                    <div class="user-cell">
                      <span class="avatar">
                        {{
                          user.name
                            .charAt(0)
                            .toUpperCase()
                        }}
                      </span>

                      <strong>
                        {{ user.name }}
                      </strong>
                    </div>
                  </td>

                  <td>
                    {{ user.email }}
                  </td>

                  <td>
                    <span
                      class="role-badge"
                      :class="{
                        superadmin:
                          user.role ===
                          'SUPERADMIN',
                      }"
                    >
                      {{
                        user.role ===
                        'SUPERADMIN'
                          ? 'Superadmin'
                          : 'Usuario'
                      }}
                    </span>
                  </td>

                  <td>
                    <span
                      class="status-badge"
                      :class="{
                        suspended:
                          user.status ===
                          'SUSPENDED',
                      }"
                    >
                      {{
                        user.status ===
                        'SUSPENDED'
                          ? 'Suspendido'
                          : 'Activo'
                      }}
                    </span>
                  </td>

                  <td>
                    {{ formatDate(user.createdAt) }}
                  </td>

                  <td class="actions-cell">
                    <button
                      type="button"
                      class="status-button"
                      :class="{
                        activate:
                          user.status ===
                          'SUSPENDED',
                      }"
                      :disabled="
                        actionUserId === user.id ||
                        user.id === authStore.user?.id
                      "
                      @click="
                        toggleUserStatus(user)
                      "
                    >
                    {{
                     user.id === authStore.user?.id
                        ? 'Tu cuenta'
                        : actionUserId === user.id
                            ? 'Procesando...'
                            : user.status === 'SUSPENDED'
                                ? 'Reactivar'
                                : 'Suspender'
                    }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="pagination">
            <span>
              Página
              <strong>{{ currentPage }}</strong>
              de
              <strong>{{ totalPages }}</strong>
            </span>

            <div class="pagination-actions">
              <button
                type="button"
                :disabled="currentPage <= 1"
                @click="
                  changePage(currentPage - 1)
                "
              >
                Anterior
              </button>

              <button
                type="button"
                :disabled="
                  currentPage >= totalPages
                "
                @click="
                  changePage(currentPage + 1)
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

.admin-panel {
  padding: 24px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

.search-form {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
}

.search-form input {
  min-width: 0;
  flex: 1;
  padding: 11px 13px;
  border: 1px solid #d4d4d8;
  border-radius: 9px;
  background: #ffffff;
  color: #18181b;
  font: inherit;
}

.search-form input:focus {
  border-color: #7c3aed;
  outline: 2px solid #ede9fe;
}

.primary-button,
.secondary-button,
.pagination button,
.status-button {
  padding: 10px 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 13px;
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

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #27272a;
}

.avatar {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ede9fe;
  color: #6d28d9;
  font-weight: 800;
}

.role-badge,
.status-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  font-size: 11px;
  font-weight: 700;
}

.role-badge.superadmin {
  background: #ede9fe;
  color: #6d28d9;
}

.status-badge {
  background: #dcfce7;
  color: #166534;
}

.status-badge.suspended {
  background: #fee2e2;
  color: #991b1b;
}

.actions-heading,
.actions-cell {
  text-align: right;
}

.status-button {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.status-button.activate {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.status-button:disabled,
.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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

:global(html[data-theme='dark'] .admin-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .admin-header h1),
:global(html[data-theme='dark'] .user-cell),
:global(html[data-theme='dark'] .state-container strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .admin-header p),
:global(html[data-theme='dark'] td),
:global(html[data-theme='dark'] .pagination) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .admin-panel),
:global(html[data-theme='dark'] .total-card) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .search-form input) {
  border-color: #343447;
  background: #1b1b2d;
  color: #f4f4f5;
}

:global(html[data-theme='dark'] th),
:global(html[data-theme='dark'] td) {
  border-bottom-color: #29293d;
}

:global(html[data-theme='dark'] .secondary-button),
:global(html[data-theme='dark'] .pagination button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

@media (max-width: 700px) {
  .admin-page {
    padding: 28px 14px 50px;
  }

  .admin-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .search-form {
    flex-direction: column;
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