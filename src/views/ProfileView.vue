<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue'
import { useRouter } from 'vue-router'

import AppNavbar from '@/components/AppNavbar.vue'
import ViewCard from '@/components/ViewCard.vue'
import type { PoliticalView } from '@/models/view'
import {
  clearLocalHistory,
  getLocalHistory,
  getMyFavoriteIds,
  removeProfileFavorite,
  type HistoryEntry,
} from '@/services/profileService'
import {
  getViewById,
  getViews,
} from '@/services/viewsService'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/models/auth'
import { getCurrentUser } from '@/services/authService'
import { useToastStore } from '@/stores/toast'

type ProfileTab =
  | 'publications'
  | 'favorites'
  | 'history'

const authStore = useAuthStore()
const router = useRouter()
const toastStore = useToastStore()

const activeTab =
  ref<ProfileTab>('publications')

const myViews = ref<PoliticalView[]>([])
const favoriteViews =
  ref<PoliticalView[]>([])
const history = ref<HistoryEntry[]>([])

const loading = ref(false)
const errorMessage = ref('')

const removingFavoriteId =
  ref<string | null>(null)

const profileUser = ref<User | null>(
  authStore.user,
)

const user = computed(() => {
  return profileUser.value
})

// Carga toda la información necesaria del perfil
const loadProfile = async (): Promise<void> => {
  if (
    !authStore.token ||
    !authStore.user
  ) {
    await router.push({
      name: 'login',
    })

    return
  }

  loading.value = true
  errorMessage.value = ''


  try {
    const currentUser = await getCurrentUser(
      authStore.token,
    )

    profileUser.value = currentUser
    
    // Publicaciones propias
    const ownViewsResponse =
      await getViews(
        {
          autor: 'me',
          page: 1,
          limit: 50,
        },
        authStore.token,
      )

    myViews.value =
      ownViewsResponse.views ?? []

    // Favoritos
    const favoriteIds =
      await getMyFavoriteIds(
        authStore.token,
      )

    const favoriteResults =
      await Promise.allSettled(
        favoriteIds.map((id) =>
          getViewById(
            id,
            authStore.token ??
              undefined,
          ),
        ),
      )

    favoriteViews.value =
  favoriteResults
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<PoliticalView> =>
        result.status ===
        'fulfilled',
    )
    .map(
      (result) => result.value,
    )
    .filter(
      (view) =>
        view.status === 'PUBLISHED',
    )

    // Historial local
    history.value =
      getLocalHistory()
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value =
        error.message
    } else {
      errorMessage.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    loading.value = false
  }
}

const formatDate = (
  date: string,
): string => {
  return new Intl.DateTimeFormat(
    'es-CR',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    },
  ).format(
    new Date(date),
  )
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

const editView = (
  viewId: string,
): void => {
  router.push({
    name: 'view-edit',
    params: {
      id: viewId,
    },
  })
}

const handleFavoriteRemoved = (
  viewId: string,
): void => {
  favoriteViews.value =
    favoriteViews.value.filter(
      (view) => view.id !== viewId,
    )
}

// Elimina una publicación de favoritos
const removeFavorite = async (
  viewId: string,
): Promise<void> => {
  if (
    !authStore.token ||
    removingFavoriteId.value
  ) {
    return
  }

  removingFavoriteId.value =
    viewId

  try {
    await removeProfileFavorite(
      viewId,
      authStore.token,
    )

    favoriteViews.value =
      favoriteViews.value.filter(
        (view) =>
          view.id !== viewId,
      )

    toastStore.success(
      'Publicación eliminada de favoritos.',
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
    removingFavoriteId.value = null
  }
}

// Elimina el historial guardado
const clearHistory = (): void => {
  const confirmed =
    window.confirm(
      '¿Deseas limpiar todo tu historial?',
    )

  if (!confirmed) {
    return
  }

  clearLocalHistory()
  history.value = []

  toastStore.success(
    'Historial eliminado correctamente.',
  )
}

// Cierra la sesión
const handleLogout = async (): Promise<void> => {
  authStore.logout()

  toastStore.success(
    'Sesión cerrada correctamente.',
  )

  await router.push({
    name: 'tablero',
  })
}

onMounted(loadProfile)
</script>

<template>
  <AppNavbar />

  <main class="profile-page">
    <div class="profile-container">
      <!-- Datos del usuario -->
      <header
        v-if="user"
        class="profile-header"
      >
        <div class="profile-avatar">
          {{
            user.name
              .charAt(0)
              .toUpperCase()
          }}
        </div>

        <div class="profile-info">
          <span class="eyebrow">
            MI PERFIL
          </span>

          <h1>
            {{ user.name }}
          </h1>

          <p>
            {{ user.email }}
          </p>

          <div class="profile-meta">
            <span>
              {{
                user.role ===
                'SUPERADMIN'
                  ? 'Superadmin'
                  : 'Usuario'
              }}
            </span>

            <span>
              Miembro desde
              {{
                formatDate(
                  user.createdAt,
                )
              }}
            </span>
          </div>
        </div>

        <button
          type="button"
          class="logout-button"
          @click="handleLogout"
        >
          Cerrar sesión
        </button>
      </header>

      <!-- Pestañas -->
      <nav
        class="profile-tabs"
        aria-label="Secciones del perfil"
      >
        <button
          type="button"
          :class="{
            active:
              activeTab ===
              'publications',
          }"
          @click="
            activeTab =
              'publications'
          "
        >
          Mis publicaciones

          <span>
            {{ myViews.length }}
          </span>
        </button>

        <button
          type="button"
          :class="{
            active:
              activeTab ===
              'favorites',
          }"
          @click="
            activeTab =
              'favorites'
          "
        >
          Mis favoritos

          <span>
            {{ favoriteViews.length }}
          </span>
        </button>

        <button
          type="button"
          :class="{
            active:
              activeTab ===
              'history',
          }"
          @click="
            activeTab =
              'history'
          "
        >
          Historial

          <span>
            {{ history.length }}
          </span>
        </button>
      </nav>

      <!-- Loading -->
      <section
        v-if="loading"
        class="state-card"
      >
        <span class="loader"></span>

        <p>
          Cargando perfil...
        </p>
      </section>

      <!-- Error -->
      <section
        v-else-if="errorMessage"
        class="state-card"
      >
        <strong>
          No fue posible cargar tu perfil.
        </strong>

        <p>
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="primary-button"
          @click="loadProfile"
        >
          Intentar nuevamente
        </button>
      </section>

      <!-- Mis publicaciones -->
      <section
        v-else-if="
          activeTab ===
          'publications'
        "
        class="profile-panel"
      >
        <div class="section-heading">
          <div>
            <span class="eyebrow">
              CONTENIDO
            </span>

            <h2>
              Mis publicaciones
            </h2>

            <p>
              Publicaciones creadas
              desde tu cuenta.
            </p>
          </div>
        </div>

        <div
          v-if="myViews.length === 0"
          class="empty-state"
        >
          <h3>
            Aún no tienes publicaciones
          </h3>

          <p>
            Cuando publiques un tema,
            aparecerá aquí.
          </p>

          <button
            type="button"
            class="primary-button"
            @click="
              router.push({
                name: 'view-create',
              })
            "
          >
            Crear publicación
          </button>
        </div>

        <div
          v-else
          class="views-grid"
        >
          <article
            v-for="view in myViews"
            :key="view.id"
            class="owned-view"
          >
            <ViewCard
              :view="view"
            />

            <div class="owned-actions">
              <span
                v-if="
                  view.status ===
                  'UNPUBLISHED'
                "
                class="unpublished-badge"
              >
                Despublicada
              </span>

              <button
                type="button"
                class="secondary-button"
                @click="
                  openView(view.id)
                "
              >
                Ver detalle
              </button>

              <button
                type="button"
                class="primary-button"
                @click="
                  editView(view.id)
                "
              >
                Editar
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- Favoritos -->
      <section
        v-else-if="
          activeTab ===
          'favorites'
        "
        class="profile-panel"
      >
        <div class="section-heading">
          <div>
            <span class="eyebrow">
              GUARDADOS
            </span>

            <h2>
              Mis favoritos
            </h2>

            <p>
              Publicaciones que has
              guardado para consultar
              después.
            </p>
          </div>
        </div>

        <div
          v-if="
            favoriteViews.length === 0
          "
          class="empty-state"
        >
          <h3>
            No tienes favoritos
          </h3>

          <p>
            Guarda publicaciones desde
            el tablero o desde su
            detalle.
          </p>
        </div>

        <div
          v-else
          class="views-grid"
        >
          <article
            v-for="
              view in favoriteViews
            "
            :key="view.id"
            class="owned-view"
          >
            <ViewCard
              :view="view"
              @remove-favorite="handleFavoriteRemoved"
            />

            <div class="owned-actions">
              <button
                type="button"
                class="secondary-button"
                @click="
                  openView(view.id)
                "
              >
                Ver detalle
              </button>

              <button
                type="button"
                class="remove-button"
                :disabled="
                  removingFavoriteId ===
                  view.id
                "
                @click="
                  removeFavorite(view.id)
                "
              >
                {{
                  removingFavoriteId ===
                  view.id
                    ? 'Eliminando...'
                    : 'Quitar favorito'
                }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- Historial -->
      <section
        v-else
        class="profile-panel"
      >
        <div class="section-heading history-heading">
          <div>
            <span class="eyebrow">
              RECIENTES
            </span>

            <h2>
              Historial
            </h2>

            <p>
              Últimas publicaciones
              que has visitado.
            </p>
          </div>

          <button
            v-if="history.length"
            type="button"
            class="remove-button"
            @click="clearHistory"
          >
            Limpiar historial
          </button>
        </div>

        <div
          v-if="history.length === 0"
          class="empty-state"
        >
          <h3>
            Tu historial está vacío
          </h3>

          <p>
            Las publicaciones que
            visites aparecerán aquí.
          </p>
        </div>

        <div
          v-else
          class="history-list"
        >
          <button
            v-for="entry in history"
            :key="
              `${entry.id}-${entry.fechaVista}`
            "
            type="button"
            class="history-item"
            @click="
              openView(entry.id)
            "
          >
            <div>
              <strong>
                {{ entry.titulo }}
              </strong>

              <span>
                {{ entry.categoria }}
              </span>
            </div>

            <time>
              {{
                formatDate(
                  entry.fechaVista,
                )
              }}
            </time>
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 40px 24px 70px;
  background: #f7f7fb;
}

.profile-container {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

.profile-avatar {
  display: flex;
  width: 76px;
  height: 76px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #7c3aed;
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
}

.profile-info {
  min-width: 0;
  flex: 1;
}

.eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.profile-info h1,
.section-heading h2 {
  margin: 0;
  color: #18181b;
}

.profile-info h1 {
  font-size: 28px;
}

.profile-info > p,
.section-heading p {
  margin: 7px 0 0;
  color: #71717a;
  font-size: 13px;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.profile-meta span {
  padding: 5px 9px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #52525b;
  font-size: 11px;
  font-weight: 700;
}

.logout-button {
  padding: 10px 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.profile-tabs {
  display: flex;
  gap: 8px;
  margin: 22px 0;
  overflow-x: auto;
}

.profile-tabs button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #d4d4d8;
  border-radius: 9px;
  background: #ffffff;
  color: #52525b;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.profile-tabs button.active {
  border-color: #7c3aed;
  background: #f5f3ff;
  color: #6d28d9;
}

.profile-tabs span {
  display: inline-flex;
  min-width: 22px;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 999px;
  background: #ede9fe;
  font-size: 10px;
}

.profile-panel,
.state-card {
  padding: 26px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.history-heading {
  align-items: center;
}

.views-grid {
  display: grid;
  grid-template-columns:
    repeat(auto-fit, minmax(300px, 1fr));
  gap: 18px;
}

.owned-view {
  min-width: 0;
}

.owned-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.primary-button,
.secondary-button,
.remove-button {
  padding: 9px 13px;
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

.remove-button {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.remove-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.unpublished-badge {
  align-self: center;
  margin-right: auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 10px;
  font-weight: 700;
}

.empty-state,
.state-card {
  padding: 50px 20px;
  color: #71717a;
  text-align: center;
}

.empty-state h3,
.state-card strong {
  margin-top: 0;
  color: #27272a;
}

.loader {
  display: inline-block;
  width: 26px;
  height: 26px;
  border: 3px solid #ddd6fe;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
  padding: 15px;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  background: #fafafa;
  text-align: left;
  cursor: pointer;
}

.history-item div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.history-item strong {
  overflow: hidden;
  color: #27272a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item span,
.history-item time {
  color: #71717a;
  font-size: 11px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Tema oscuro */

:global(html[data-theme='dark'] .profile-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .profile-header),
:global(html[data-theme='dark'] .profile-panel),
:global(html[data-theme='dark'] .state-card) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .profile-info h1),
:global(html[data-theme='dark'] .section-heading h2),
:global(html[data-theme='dark'] .empty-state h3),
:global(html[data-theme='dark'] .state-card strong),
:global(html[data-theme='dark'] .history-item strong) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .profile-info > p),
:global(html[data-theme='dark'] .section-heading p),
:global(html[data-theme='dark'] .empty-state),
:global(html[data-theme='dark'] .state-card),
:global(html[data-theme='dark'] .history-item span),
:global(html[data-theme='dark'] .history-item time) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .profile-meta span) {
  background: #24243a;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .profile-tabs button),
:global(html[data-theme='dark'] .secondary-button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .profile-tabs button.active) {
  border-color: #8b5cf6;
  background: #2e2448;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .history-item) {
  border-color: #29293d;
  background: #1b1b2d;
}

:global(html[data-theme='dark'] .profile-tabs span) {
  background: #3b2f5f;
  color: #ffffff;
}

:global(
  html[data-theme='dark']
    .profile-tabs button.active span
) {
  background: #7c3aed;
  color: #ffffff;
}

/* Responsive */

@media (max-width: 700px) {
  .profile-page {
    padding: 28px 14px 50px;
  }

  .profile-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .logout-button {
    width: 100%;
  }

  .views-grid {
    grid-template-columns: 1fr;
  }

  .history-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .history-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>