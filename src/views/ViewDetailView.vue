<script setup lang="ts">
import AppNavbar from '@/components/AppNavbar.vue'

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

import type {
  PoliticalView,
  ReactionType,
  ViewSideType,
} from '@/models/view'

import {
  addFavorite,
  removeFavorite,
} from '@/services/favoritesService'

import {
  getViewById,
  reactToViewSide,
  unpublishViewById,
} from '@/services/viewsService'

import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Publicación obtenida desde el API
const view = ref<PoliticalView | null>(null)

// Estados de carga y error
const loading = ref(true)
const errorMessage = ref('')

// Estado del favorito
const isFavorite = ref(false)
const favoriteLoading = ref(false)
const favoriteMessage = ref('')
const favoriteError = ref('')

// Estado para compartir
const shareMessage = ref('')

// Estados para likes y dislikes
const reactionLoading = ref<Record<string, boolean>>({})
const reactionMessage = ref('')
const reactionError = ref('')

// Estados utilizados al despublicar
const unpublishLoading = ref(false)
const unpublishMessage = ref('')
const unpublishError = ref('')


// Indica si el usuario actual es el autor
const isAuthor = computed(() => {
  if (!view.value || !authStore.user) {
    return false
  }

  return authStore.user.id === view.value.authorId
})



// Indica si el usuario actual es superadministrador
const isSuperadmin = computed(() => {
  return authStore.user?.role === 'SUPERADMIN'
})

// Mantiene sincronizado el favorito
watch(
  () => view.value?.isFavorite,
  (newValue) => {
    if (typeof newValue === 'boolean') {
      isFavorite.value = newValue
    }
  },
)


// Obtiene la publicación utilizando el ID de la URL
const loadView = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''

  try {
    const viewId = route.params.id

    if (
      typeof viewId !== 'string' ||
      !viewId
    ) {
      throw new Error(
        'El identificador de la publicación no es válido.',
      )
    }

    view.value = await getViewById(
      viewId,
      authStore.token ?? undefined,
    )

    isFavorite.value = view.value.isFavorite
  } catch (error) {
    view.value = null

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

// Agrega o elimina la publicación de favoritos
const toggleFavorite = async (): Promise<void> => {
  favoriteMessage.value = ''
  favoriteError.value = ''

  if (
    !authStore.isAuthenticated ||
    !authStore.token
  ) {
    await router.push({
      name: 'login',
    })

    return
  }

  if (!view.value || favoriteLoading.value) {
    return
  }

  favoriteLoading.value = true

  try {
    if (isFavorite.value) {
      isFavorite.value = await removeFavorite(
        view.value.id,
        authStore.token,
      )

      favoriteMessage.value =
        'Publicación eliminada de favoritos.'
    } else {
      isFavorite.value = await addFavorite(
        view.value.id,
        authStore.token,
      )

      favoriteMessage.value =
        'Publicación guardada en favoritos.'
    }
  } catch (error) {
    if (error instanceof Error) {
      favoriteError.value = error.message
    } else {
      favoriteError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    favoriteLoading.value = false
  }
}

// Registra un like o dislike
const handleReaction = async (
  sideType: ViewSideType,
  reaction: ReactionType,
): Promise<void> => {
  reactionMessage.value = ''
  reactionError.value = ''

  if (
    !authStore.isAuthenticated ||
    !authStore.token
  ) {
    await router.push({
      name: 'login',
    })

    return
  }

  if (!view.value) {
    return
  }

  const side = view.value.sides.find(
    (item) => item.type === sideType,
  )

  if (!side) {
    reactionError.value =
      'No fue posible encontrar la postura.'

    return
  }

  if (reactionLoading.value[side.id]) {
    return
  }

  reactionLoading.value[side.id] = true

  try {
    const response = await reactToViewSide(
      view.value.id,
      sideType,
      reaction,
      authStore.token,
    )

    side.likeCount = response.likeCount
    side.dislikeCount = response.dislikeCount
    side.myReaction = response.myReaction

    view.value.totalLikes =
      view.value.sides.reduce(
        (total, currentSide) =>
          total + currentSide.likeCount,
        0,
      )

    view.value.totalDislikes =
      view.value.sides.reduce(
        (total, currentSide) =>
          total + currentSide.dislikeCount,
        0,
      )

    reactionMessage.value =
      reaction === 'LIKE'
        ? 'Like registrado.'
        : 'Dislike registrado.'
  } catch (error) {
    if (error instanceof Error) {
      reactionError.value = error.message
    } else {
      reactionError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    reactionLoading.value[side.id] = false
  }
}

// Comparte la publicación o copia el enlace
const shareView = async (): Promise<void> => {
  if (!view.value) {
    return
  }

  shareMessage.value = ''

  const title =
    view.value.sides.find(
      (side) => side.type === 'SIDE',
    )?.title ?? 'Publicación de LasDosCaras'

  const shareData = {
    title,
    text:
      `Mira esta publicación en LasDosCaras: ${title}`,
    url: window.location.href,
  }

  if (
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share(shareData)

      shareMessage.value =
        'Publicación compartida.'

      return
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return
      }
    }
  }

  try {
    await navigator.clipboard.writeText(
      shareData.url,
    )

    shareMessage.value =
      'Enlace copiado al portapapeles.'
  } catch {
    shareMessage.value =
      'No fue posible copiar el enlace.'
  }
}

// Convierte una URL de YouTube en URL de iframe
const getYoutubeEmbedUrl = (
  url: string,
): string | null => {
  try {
    const parsedUrl = new URL(url)

    if (
      parsedUrl.hostname.includes('youtube.com')
    ) {
      const videoId =
        parsedUrl.searchParams.get('v')

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    if (
      parsedUrl.hostname.includes('youtu.be')
    ) {
      const videoId =
        parsedUrl.pathname.replace('/', '')

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    return null
  } catch {
    return null
  }
}

// Redirige al formulario de edición
const editView = async (): Promise<void> => {
  if (!view.value) {
    return
  }

  await router.push({
    name: 'view-edit',
    params: {
      id: view.value.id,
    },
  })
}

// Despublica la publicación actual
const unpublishView = async (): Promise<void> => {
  unpublishMessage.value = ''
  unpublishError.value = ''

  if (
    !view.value ||
    !authStore.token
  ) {
    return
  }

  // Protección adicional en frontend
  if (!isSuperadmin.value) {
    unpublishError.value =
      'No tienes permiso para realizar esta acción.'

    return
  }

  // Confirmación antes de realizar una acción destructiva
  const confirmed = window.confirm(
    '¿Estás seguro de que deseas despublicar esta publicación?',
  )

  if (!confirmed) {
    return
  }

  if (unpublishLoading.value) {
    return
  }

  unpublishLoading.value = true

  try {
    // Despublicamos la publicación en el API
    await unpublishViewById(
      view.value.id,
      authStore.token,
    )

    // Actualizamos inmediatamente el estado en pantalla
    view.value.status = 'UNPUBLISHED'

    unpublishMessage.value =
      'La publicación fue despublicada correctamente.'
  } catch (error) {
    if (error instanceof Error) {
      unpublishError.value = error.message
    } else {
      unpublishError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    unpublishLoading.value = false
  }
}

onMounted(() => {
  loadView()
})
</script>


<template>
  <AppNavbar />

  <main class="detail-page">
    <section class="detail-container">
      <!-- Navegación -->
      <button
        type="button"
        class="back-button"
        @click="$router.push({ name: 'tablero' })"
      >
        <span aria-hidden="true">←</span>
        Volver al tablero
      </button>

      <!-- Cargando -->
      <div
        v-if="loading"
        class="state-container"
      >
        <div class="loader"></div>
        <p>Cargando publicación...</p>
      </div>

      <!-- Error -->
      <div
        v-else-if="errorMessage"
        class="state-container error-state"
      >
        <strong>
          No pudimos cargar la publicación.
        </strong>

        <p>
          {{ errorMessage }}
        </p>

        <button
          type="button"
          @click="loadView"
        >
          Intentar nuevamente
        </button>
      </div>

      <!-- Publicación real -->
      <template v-else-if="view">
        <header class="detail-header">
          <div class="detail-meta">
            <span class="category-badge">
              {{ view.category.name }}
            </span>

            <span
              class="publication-status"
              :class="{
                unpublished:
                  view.status === 'UNPUBLISHED',
              }"
            >
              {{
                view.status === 'PUBLISHED'
                  ? 'Publicada'
                  : 'No publicada'
              }}
            </span>
          </div>

          <h1>
            {{
              view.sides.find(
                (side) => side.type === 'SIDE',
              )?.title
            }}
          </h1>

          <div class="publication-info">
            <div class="author-avatar">
              {{
                view.author.name
                  .charAt(0)
                  .toUpperCase()
              }}
            </div>

            <div>
              <p class="author">
                Publicado por
                <strong>
                  {{ view.author.name }}
                </strong>
              </p>

              <p class="publication-date">
                {{
                  new Intl.DateTimeFormat(
                    'es-CR',
                    {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    },
                  ).format(
                    new Date(view.createdAt),
                  )
                }}
              </p>
            </div>
          </div>

          <!-- Acciones -->
          <div class="publication-actions">
            <button
              type="button"
              class="action-button"
              :class="{ active: isFavorite }"
              :disabled="favoriteLoading"
              @click="toggleFavorite"
            >
              <span aria-hidden="true">
                {{ isFavorite ? '★' : '☆' }}
              </span>

              {{
                favoriteLoading
                  ? 'Guardando...'
                  : isFavorite
                    ? 'Guardado'
                    : 'Guardar'
              }}
            </button>

            <button
              type="button"
              class="action-button"
              @click="shareView"
            >
              <span aria-hidden="true">↗</span>
              Compartir
            </button>

            <button
              v-if="isAuthor"
              type="button"
              class="action-button edit-button"
              @click="editView"
            >
              <span aria-hidden="true">✎</span>
              Editar
            </button>

            <button
              v-if="
                isSuperadmin &&
                view.status === 'PUBLISHED'
              "
              type="button"
              class="action-button danger-button"
              :disabled="unpublishLoading"
              @click="unpublishView"
            >
              <span aria-hidden="true">⊘</span>

              {{
                unpublishLoading
                  ? 'Despublicando...'
                  : 'Despublicar'
              }}
            </button>
          </div>

          <p
            v-if="favoriteMessage"
            class="action-message success"
            role="status"
          >
            {{ favoriteMessage }}
          </p>

          <p
            v-if="favoriteError"
            class="action-message error"
            role="alert"
          >
            {{ favoriteError }}
          </p>

          <p
            v-if="shareMessage"
            class="action-message success"
            role="status"
          >
            {{ shareMessage }}
          </p>

          <p
            v-if="unpublishMessage"
            class="action-message success"
            role="status"
          >
            {{ unpublishMessage }}
          </p>

          <p
            v-if="unpublishError"
            class="action-message error"
            role="alert"
          >
            {{ unpublishError }}
          </p>

        </header>

        <!-- Hashtags -->
        <div
          v-if="view.hashtags.length"
          class="hashtags"
        >
          <span
            v-for="hashtag in view.hashtags"
            :key="hashtag.id"
          >
            #{{ hashtag.name }}
          </span>
        </div>

        <!-- Lado A y Lado B -->
        <section class="sides-grid">
          <article
            v-for="side in view.sides"
            :key="side.id"
            class="side-card"
            :class="{
              'side-a': side.type === 'SIDE',
              'side-b':
                side.type === 'COUNTERPART',
            }"
          >
            <header class="side-header">
              <span class="side-label">
                {{
                  side.type === 'SIDE'
                    ? 'LADO A'
                    : 'LADO B'
                }}
              </span>

              <span
                class="side-indicator"
                aria-hidden="true"
              ></span>
            </header>

            <h2>
              {{ side.title }}
            </h2>

            <p class="description">
              {{ side.description }}
            </p>

            <!-- Fuentes -->
            <section
              v-if="side.sources.length"
              class="sources"
            >
              <h3>Fuentes</h3>

              <div
                v-for="source in side.sources"
                :key="source.id"
                class="source-item"
              >
                <a
                  :href="source.url"
                  target="_blank"
                  rel="noopener"
                >
                  <span aria-hidden="true">
                    {{
                      source.type === 'YOUTUBE'
                        ? '▶'
                        : source.type === 'DOCUMENT'
                          ? '▤'
                          : '↗'
                    }}
                  </span>

                  {{
                    source.label ??
                    source.url
                  }}
                </a>

                <div
                  v-if="
                    source.type === 'YOUTUBE' &&
                    getYoutubeEmbedUrl(
                      source.url,
                    )
                  "
                  class="youtube-container"
                >
                  <iframe
                    :src="
                      getYoutubeEmbedUrl(
                        source.url,
                      ) ?? undefined
                    "
                    :title="
                      source.label ??
                      'Video de YouTube'
                    "
                    allow="
                      accelerometer;
                      autoplay;
                      clipboard-write;
                      encrypted-media;
                      gyroscope;
                      picture-in-picture
                    "
                    allowfullscreen
                  ></iframe>
                </div>
              </div>
            </section>

            <!-- Reacciones -->
            <footer class="reactions">
              <button
                type="button"
                :class="{
                  active:
                    side.myReaction === 'LIKE',
                }"
                :disabled="
                  reactionLoading[side.id]
                "
                @click="
                  handleReaction(
                    side.type,
                    'LIKE',
                  )
                "
              >
                <span aria-hidden="true">
                  👍
                </span>

                {{
                  reactionLoading[side.id]
                    ? '...'
                    : side.likeCount
                }}
              </button>

              <button
                type="button"
                :class="{
                  active:
                    side.myReaction ===
                    'DISLIKE',
                }"
                :disabled="
                  reactionLoading[side.id]
                "
                @click="
                  handleReaction(
                    side.type,
                    'DISLIKE',
                  )
                "
              >
                <span aria-hidden="true">
                  👎
                </span>

                {{
                  reactionLoading[side.id]
                    ? '...'
                    : side.dislikeCount
                }}
              </button>
            </footer>
          </article>
        </section>

        <!-- Mensajes de reacciones -->
        <p
          v-if="reactionMessage"
          class="reaction-message success"
          role="status"
        >
          {{ reactionMessage }}
        </p>

        <p
          v-if="reactionError"
          class="reaction-message error"
          role="alert"
        >
          {{ reactionError }}
        </p>

        <!-- Resumen -->
        <section class="detail-summary">
          <div>
            <span>Opiniones</span>

            <strong>
              {{
                view.totalLikes +
                view.totalDislikes
              }}
            </strong>
          </div>

          <div>
            <span>Hilos</span>

            <strong>
              {{ view._count.threads }}
            </strong>
          </div>

          <div>
            <span>Estado</span>

            <strong>
              {{
                isFavorite
                  ? 'Favorito'
                  : 'Sin guardar'
              }}
            </strong>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.detail-page {
  min-height: calc(100vh - 72px);
  padding: 45px 24px 70px;
  background: #f7f7fb;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.detail-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

/* Navegación */

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 22px;
  padding: 9px 13px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  color: #52525b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.back-button:hover {
  border-color: #c4b5fd;
  background: #faf9ff;
  color: #6d28d9;
}

/* Aviso temporal */

.demo-notice {
  margin-bottom: 18px;
  padding: 10px 14px;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 11px;
  font-weight: 700;
}

/* Encabezado */

.detail-header {
  padding: 30px;
  border: 1px solid #e8e7ef;
  border-radius: 18px;
  background: #ffffff;
  box-shadow:
    0 8px 30px rgba(15, 16, 32, 0.05);
}

.detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  margin-bottom: 15px;
}

.category-badge {
  padding: 7px 11px;
  border-radius: 20px;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.publication-status {
  padding: 7px 11px;
  border-radius: 20px;
  background: #ecfdf5;
  color: #15803d;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.publication-status.unpublished {
  background: #fef2f2;
  color: #b91c1c;
}

.detail-header h1 {
  max-width: 820px;
  margin: 0 0 22px;
  color: #18181b;
  font-size: 38px;
  line-height: 1.18;
  letter-spacing: -1.1px;
}

.publication-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  display: flex;
  width: 43px;
  height: 43px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background:
    linear-gradient(
      135deg,
      #4f46e5,
      #7c3aed
    );
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
}

.author {
  margin: 0;
  color: #71717a;
  font-size: 13px;
}

.author strong {
  color: #27272a;
}

.publication-date {
  margin: 4px 0 0;
  color: #a1a1aa;
  font-size: 11px;
}

/* Acciones de la publicación */

.publication-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid #e4e4e7;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  color: #52525b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.action-button:hover:not(:disabled) {
  border-color: #c4b5fd;
  background: #faf9ff;
  color: #6d28d9;
}

.action-button.active {
  border-color: #c4b5fd;
  background: #f5f3ff;
  color: #6d28d9;
}

.edit-button {
  border-color: #c4b5fd;
  color: #6d28d9;
}

.danger-button {
  border-color: #fecaca;
  color: #b91c1c;
}

.danger-button:hover:not(:disabled) {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #991b1b;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.action-message {
  margin: 12px 0 0;
  font-size: 11px;
  font-weight: 600;
}

.action-message.success {
  color: #15803d;
}

.action-message.error {
  color: #dc2626;
}

/* Hashtags */
.hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 28px;
}

.hashtags span {
  color: #6366f1;
  font-size: 12px;
  font-weight: 700;
}

/* Lados */

.sides-grid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.side-card {
  position: relative;
  min-width: 0;
  padding: 28px;
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
  box-shadow:
    0 8px 25px rgba(15, 16, 32, 0.05);
}

.side-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 4px;
}

.side-a::before {
  background:
    linear-gradient(
      90deg,
      #4f46e5,
      #7c3aed
    );
}

.side-b::before {
  background:
    linear-gradient(
      90deg,
      #27272a,
      #71717a
    );
}

.side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
}

.side-label {
  color: #71717a;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.side-indicator {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.side-a .side-indicator {
  background: #7c3aed;
}

.side-b .side-indicator {
  background: #27272a;
}

.side-card h2 {
  margin: 0 0 16px;
  color: #18181b;
  font-size: 22px;
  line-height: 1.35;
  letter-spacing: -0.4px;
}

.description {
  margin: 0;
  color: #52525b;
  font-size: 14px;
  line-height: 1.8;
}

/* Fuentes */

.sources {
  margin-top: 25px;
  padding-top: 18px;
  border-top: 1px solid #e4e4e7;
}

.sources h3 {
  margin: 0 0 11px;
  color: #27272a;
  font-size: 12px;
  font-weight: 800;
}

.sources a {
  display: flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  margin-bottom: 8px;
  color: #6d28d9;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.sources a:hover {
  text-decoration: underline;
}

.source-item {
  margin-bottom: 12px;
}

.youtube-container {
  position: relative;
  width: 100%;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 12px;
  aspect-ratio: 16 / 9;
  background: #18181b;
}

.youtube-container iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

/* Reacciones */

.reactions {
  display: flex;
  gap: 9px;
  margin-top: 24px;
}

.reactions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 13px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  background: #ffffff;
  color: #52525b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.reactions button:hover {
  border-color: #c4b5fd;
  background: #faf9ff;
  color: #6d28d9;
}

.reactions button.active {
  border-color: #c4b5fd;
  background: #f5f3ff;
  color: #6d28d9;
}

.reactions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.reaction-message {
  margin: 14px 0 0;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.reaction-message.success {
  color: #15803d;
}

.reaction-message.error {
  color: #dc2626;
}

/* Resumen inferior */

.detail-summary {
  display: flex;
  align-items: center;
  gap: 35px;
  margin-top: 22px;
  padding: 18px 22px;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #ffffff;
}

.detail-summary div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-summary span {
  color: #a1a1aa;
  font-size: 11px;
}

.detail-summary strong {
  color: #52525b;
  font-size: 12px;
}

/* Responsive */

@media (max-width: 760px) {
  .detail-page {
    padding: 30px 16px 55px;
  }

  .detail-header {
    padding: 23px;
  }

  .detail-header h1 {
    font-size: 30px;
  }

  .sides-grid {
    grid-template-columns: 1fr;
  }

  .detail-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .detail-header {
    padding: 20px;
  }

  .detail-header h1 {
    font-size: 27px;
  }

  .side-card {
    padding: 22px;
  }

  .side-card h2 {
    font-size: 20px;
  }
}

/* Tema oscuro */

:global(html[data-theme='dark'] .detail-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .back-button) {
  border-color: #343447;
  background: #171728;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .back-button:hover) {
  border-color: #8b5cf6;
  background: #29243f;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .demo-notice) {
  border-color: #4c3c78;
  background: #211d37;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .detail-header) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .category-badge) {
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .publication-status) {
  background: #153328;
  color: #86efac;
}

:global(
  html[data-theme='dark']
    .publication-status.unpublished
) {
  background: #3f1d24;
  color: #fca5a5;
}

:global(html[data-theme='dark'] .detail-header h1) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .author) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .author strong) {
  color: #e4e4e7;
}

:global(html[data-theme='dark'] .publication-date) {
  color: #71717a;
}

:global(html[data-theme='dark'] .hashtags span) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .side-card) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .side-b::before) {
  background:
    linear-gradient(
      90deg,
      #d4d4d8,
      #71717a
    );
}

:global(html[data-theme='dark'] .side-label) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .side-b .side-indicator) {
  background: #d4d4d8;
}

:global(html[data-theme='dark'] .side-card h2) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .description) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .sources) {
  border-top-color: #343447;
}

:global(html[data-theme='dark'] .sources h3) {
  color: #e4e4e7;
}

:global(html[data-theme='dark'] .sources a) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .reactions button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .reactions button:hover) {
  border-color: #8b5cf6;
  background: #29243f;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .reactions button.active) {
  border-color: #8b5cf6;
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .detail-summary) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .detail-summary span) {
  color: #71717a;
}

:global(html[data-theme='dark'] .detail-summary strong) {
  color: #d4d4d8;
}

:global(
  html[data-theme='dark']
    .publication-actions
) {
  border-top-color: #343447;
}

:global(
  html[data-theme='dark']
    .action-button
) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(
  html[data-theme='dark']
    .action-button:hover:not(:disabled)
) {
  border-color: #8b5cf6;
  background: #29243f;
  color: #c4b5fd;
}

:global(
  html[data-theme='dark']
    .action-button.active
) {
  border-color: #8b5cf6;
  background: #302b4d;
  color: #c4b5fd;
}

:global(
  html[data-theme='dark']
    .action-message.success
) {
  color: #86efac;
}

:global(
  html[data-theme='dark']
    .action-message.error
) {
  color: #fca5a5;
}

:global(
  html[data-theme='dark']
    .edit-button
) {
  border-color: #8b5cf6;
  color: #c4b5fd;
}

:global(
  html[data-theme='dark']
    .danger-button
) {
  border-color: #7f1d1d;
  color: #fca5a5;
}

:global(
  html[data-theme='dark']
    .danger-button:hover:not(:disabled)
) {
  background: #3f1d24;
  color: #fecaca;
}
</style>