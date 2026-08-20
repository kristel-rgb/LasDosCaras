<script setup lang="ts">
import AppNavbar from '@/components/AppNavbar.vue'
import type { ViewThread } from '@/models/thread'

import {
  createThreadComment,
  createViewThread,
  getViewThreads,
} from '@/services/threadsService'

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

// Formulario para crear un hilo
const newThreadTitle = ref('')
const newThreadContent = ref('')
const creatingThread = ref(false)
const threadMessage = ref('')

// Hilos y comentarios
const threads = ref<ViewThread[]>([])
const threadsLoading = ref(false)
const threadsError = ref('')

// Respuestas a los hilos
const commentContents = ref<Record<string, string>>({})
const commentingThreadId = ref<string | null>(null)

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
    await loadThreads()
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

// Carga los hilos asociados a la publicación
const loadThreads = async (): Promise<void> => {
  if (!view.value) {
    return
  }

  threadsLoading.value = true
  threadsError.value = ''

  try {
    threads.value = await getViewThreads(
      view.value.id,
      authStore.token ?? undefined,
    )
  } catch (error) {
    if (error instanceof Error) {
      threadsError.value = error.message
    } else {
      threadsError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    threadsLoading.value = false
  }
}

// Crea un nuevo hilo dentro de la publicación
const handleCreateThread = async (): Promise<void> => {
  threadsError.value = ''
  threadMessage.value = ''

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

  if (
    !newThreadTitle.value.trim() ||
    !newThreadContent.value.trim()
  ) {
    threadsError.value =
      'Debes ingresar un título y un comentario.'

    return
  }

  if (creatingThread.value) {
    return
  }

  creatingThread.value = true

  try {
    await createViewThread(
      view.value.id,
      {
        title: newThreadTitle.value.trim(),
        content: newThreadContent.value.trim(),
      },
      authStore.token,
    )

    newThreadTitle.value = ''
    newThreadContent.value = ''

    threadMessage.value =
      'Hilo creado correctamente.'

    // Recarga la lista real de hilos
    await loadThreads()
  } catch (error) {
    if (error instanceof Error) {
      threadsError.value = error.message
    } else {
      threadsError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    creatingThread.value = false
  }
}

// Agrega un comentario a un hilo existente
const handleCreateComment = async (
  threadId: string,
): Promise<void> => {
  threadsError.value = ''
  threadMessage.value = ''

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

  const content =
    commentContents.value[threadId]?.trim()

  if (!content) {
    threadsError.value =
      'Debes escribir un comentario.'

    return
  }

  if (commentingThreadId.value) {
    return
  }

  commentingThreadId.value = threadId

  try {
    await createThreadComment(
      view.value.id,
      threadId,
      content,
      authStore.token,
    )

    // Limpiamos únicamente el comentario de este hilo
    commentContents.value[threadId] = ''

    threadMessage.value =
      'Comentario publicado correctamente.'

    // Recargamos los hilos para mostrar el comentario nuevo
    await loadThreads()
  } catch (error) {
    if (error instanceof Error) {
      threadsError.value = error.message
    } else {
      threadsError.value =
        'Ocurrió un error inesperado.'
    }
  } finally {
    commentingThreadId.value = null
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
            <span>Reacciones</span>

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

        <!-- Hilos y comentarios -->
        <section class="threads-section">
          <div class="threads-header">
            <div>
              <span class="threads-eyebrow">
                CONVERSACIÓN
              </span>

              <h2>Hilos de discusión</h2>
            </div>

            <span class="threads-count">
              {{ threads.length }}
              {{ threads.length === 1 ? 'hilo' : 'hilos' }}
            </span>
          </div>

          <!-- Cargando -->
          <p
            v-if="threadsLoading"
            class="threads-state"
          >
            Cargando hilos...
          </p>

          <!-- Sin hilos -->
          <div
            v-else-if="threads.length === 0"
            class="empty-threads"
          >
            <p>
              Todavía no hay hilos en esta publicación.
            </p>

            <span>
              Sé la primera persona en iniciar una conversación.
            </span>
          </div>

          <!-- Lista de hilos -->
          <div
            v-else
            class="threads-list"
          >
            <article
              v-for="thread in threads"
              :key="thread.id"
              class="thread-card"
            >
              <h3>
                {{ thread.title }}
              </h3>

              <p class="thread-date">
                {{
                  new Intl.DateTimeFormat(
                    'es-CR',
                    {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    },
                  ).format(
                    new Date(thread.createdAt),
                  )
                }}
              </p>

              <!-- Comentarios del hilo -->
              <div
                v-for="comment in thread.comments"
                :key="comment.id"
                class="thread-comment"
              >
                <div class="comment-header">
                  <div class="comment-avatar">
                    {{
                      comment.user.name
                        .charAt(0)
                        .toUpperCase()
                    }}
                  </div>

                  <div>
                    <strong>
                      {{ comment.user.name }}
                    </strong>

                    <span>
                      {{
                        new Intl.DateTimeFormat(
                          'es-CR',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          },
                        ).format(
                          new Date(comment.createdAt),
                        )
                      }}
                    </span>
                  </div>
                </div>

                <p>
                  {{ comment.content }}
                </p>
              </div>

              <!-- Responder al hilo -->
              <form
                class="reply-form"
                @submit.prevent="handleCreateComment(thread.id)"
              >
                <textarea
                  v-model="commentContents[thread.id]"
                  rows="2"
                  placeholder="Escribe una respuesta..."
                ></textarea>

                <button
                  type="submit"
                  class="reply-button"
                  :disabled="commentingThreadId === thread.id"
                >
                  {{
                    commentingThreadId === thread.id
                      ? 'Publicando...'
                      : 'Responder'
                  }}
                </button>
              </form>
            </article>
          </div>

          <!-- Crear hilo -->
          <form
            class="thread-form"
            @submit.prevent="handleCreateThread"
          >
            <h3>Crear un hilo</h3>

            <label for="thread-title">
              Título
            </label>

            <input
              id="thread-title"
              v-model="newThreadTitle"
              type="text"
              placeholder="¿Sobre qué quieres conversar?"
            />

            <label for="thread-content">
              Comentario
            </label>

            <textarea
              id="thread-content"
              v-model="newThreadContent"
              rows="4"
              placeholder="Escribe tu opinión..."
            ></textarea>

            <button
              type="submit"
              class="create-thread-button"
              :disabled="creatingThread"
            >
              {{
                creatingThread
                  ? 'Creando...'
                  : 'Crear hilo'
              }}
            </button>
          </form>

          <p
            v-if="threadMessage"
            class="action-message success"
            role="status"
          >
            {{ threadMessage }}
          </p>

          <p
            v-if="threadsError"
            class="action-message error"
            role="alert"
          >
            {{ threadsError }}
          </p>
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

/* =========================
   NAVEGACIÓN
   ========================= */

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

/* =========================
   ENCABEZADO
   ========================= */

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

/* =========================
   ACCIONES
   ========================= */

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

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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

/* =========================
   HASHTAGS
   ========================= */

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

/* =========================
   LADOS
   ========================= */

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

/* =========================
   FUENTES
   ========================= */

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
  max-width: 100%;
  margin-bottom: 8px;
  overflow-wrap: anywhere;
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

/* =========================
   REACCIONES
   ========================= */

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

.reactions button:hover:not(:disabled) {
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

/* =========================
   RESUMEN
   ========================= */

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

/* =========================
   HILOS Y COMENTARIOS
   ========================= */

.threads-section {
  margin-top: 24px;
  padding: 24px;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  background: #ffffff;
}

.threads-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.threads-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #7c3aed;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.threads-header h2 {
  margin: 0;
  color: #18181b;
  font-size: 1.3rem;
}

.threads-count {
  padding: 6px 10px;
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  color: #71717a;
  font-size: 0.75rem;
}

.threads-state {
  color: #71717a;
}

/* Estado vacío */

.empty-threads {
  margin-bottom: 24px;
  padding: 20px;
  border: 1px dashed #d4d4d8;
  border-radius: 12px;
  background: #fafafa;
  text-align: center;
}

.empty-threads p {
  margin: 0 0 6px;
  color: #27272a;
  font-weight: 700;
}

.empty-threads span {
  color: #71717a;
  font-size: 0.85rem;
}

/* Lista de hilos */

.threads-list {
  display: grid;
  gap: 14px;
  margin-bottom: 24px;
}

.thread-card {
  padding: 18px;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #fafafa;
}

.thread-card h3 {
  margin: 0 0 6px;
  color: #27272a;
}

/* Fecha del hilo */

.thread-date {
  margin: 0 0 16px;
  color: #a1a1aa;
  font-size: 11px;
}

/* Encabezado del comentario */

.comment-header {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
}

.comment-avatar {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #7c3aed;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.comment-header strong {
  display: block;
  color: #6d28d9;
  font-size: 12px;
}

.comment-header span {
  display: block;
  margin-top: 2px;
  color: #a1a1aa;
  font-size: 10px;
}

/* Comentarios */

.thread-comment {
  padding-top: 12px;
  border-top: 1px solid #e4e4e7;
}

.thread-comment + .thread-comment {
  margin-top: 12px;
}

.thread-comment p {
  margin: 6px 0 0;
  color: #52525b;
  line-height: 1.6;
}

/* Responder a un hilo */

.reply-form {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #e4e4e7;
}

.reply-form textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 58px;
  padding: 10px 12px;
  border: 1px solid #d4d4d8;
  border-radius: 9px;
  outline: none;
  background: #ffffff;
  color: #18181b;
  font: inherit;
  resize: vertical;
}

.reply-form textarea:focus {
  border-color: #8b5cf6;
}

.reply-form textarea::placeholder {
  color: #a1a1aa;
}

.reply-button {
  flex-shrink: 0;
  padding: 10px 15px;
  border: 0;
  border-radius: 8px;
  background: #7c3aed;
  color: #ffffff;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.reply-button:hover:not(:disabled) {
  background: #6d28d9;
}

.reply-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* Formulario para crear un hilo */

.thread-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 22px;
  border-top: 1px solid #e4e4e7;
}

.thread-form h3 {
  margin: 0 0 8px;
  color: #27272a;
}

.thread-form label {
  color: #52525b;
  font-size: 0.8rem;
  font-weight: 600;
}

.thread-form input,
.thread-form textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d4d4d8;
  border-radius: 9px;
  outline: none;
  background: #ffffff;
  color: #18181b;
  font: inherit;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.thread-form textarea {
  min-height: 100px;
  resize: vertical;
}

.thread-form input:focus,
.thread-form textarea:focus {
  border-color: #8b5cf6;
  box-shadow:
    0 0 0 3px rgba(124, 58, 237, 0.08);
}

.thread-form input::placeholder,
.thread-form textarea::placeholder {
  color: #a1a1aa;
}

.create-thread-button {
  align-self: flex-start;
  margin-top: 6px;
  padding: 10px 18px;
  border: 0;
  border-radius: 8px;
  background: #7c3aed;
  color: #ffffff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.create-thread-button:hover:not(:disabled) {
  background: #6d28d9;
}

.create-thread-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* =========================
   RESPONSIVE
   ========================= */

   /* Responsive de hilos */

@media (max-width: 600px) {
  .threads-section {
    padding: 18px;
  }

  .threads-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .create-thread-button {
    width: 100%;
  }
}


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

@media (max-width: 600px) {
  .threads-section {
    padding: 18px;
  }

  .threads-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .create-thread-button {
    width: 100%;
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

/* =========================
   TEMA OSCURO
   ========================= */

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

:global(html[data-theme='dark'] .publication-actions) {
  border-top-color: #343447;
}

:global(html[data-theme='dark'] .action-button) {
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

:global(html[data-theme='dark'] .action-button.active) {
  border-color: #8b5cf6;
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .edit-button) {
  border-color: #8b5cf6;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .danger-button) {
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

:global(
  html[data-theme='dark']
    .reactions button:hover:not(:disabled)
) {
  border-color: #8b5cf6;
  background: #29243f;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .reactions button.active) {
  border-color: #8b5cf6;
  background: #302b4d;
  color: #c4b5fd;
}

:global(
  html[data-theme='dark']
    .reaction-message.success
) {
  color: #86efac;
}

:global(
  html[data-theme='dark']
    .reaction-message.error
) {
  color: #fca5a5;
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

/* Hilos - oscuro */

:global(html[data-theme='dark'] .threads-section) {
  border-color: #2d2d42;
  background: #171726;
}

:global(html[data-theme='dark'] .threads-eyebrow) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .threads-header h2) {
  color: #ffffff;
}

:global(html[data-theme='dark'] .threads-count) {
  border-color: #34344b;
  color: #c4c4d4;
}

:global(html[data-theme='dark'] .threads-state) {
  color: #a9a9bd;
}

:global(html[data-theme='dark'] .empty-threads) {
  border-color: #34344b;
  background: transparent;
}

:global(html[data-theme='dark'] .empty-threads p) {
  color: #ffffff;
}

:global(html[data-theme='dark'] .empty-threads span) {
  color: #9292a7;
}

:global(html[data-theme='dark'] .thread-card) {
  border-color: #34344b;
  background: #1c1b2e;
}

:global(html[data-theme='dark'] .thread-card h3) {
  color: #ffffff;
}

:global(html[data-theme='dark'] .thread-author) {
  color: #9292a7;
}

:global(html[data-theme='dark'] .thread-comment) {
  border-top-color: #34344b;
}

:global(html[data-theme='dark'] .thread-comment strong) {
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .thread-comment p) {
  color: #c4c4d4;
}

:global(html[data-theme='dark'] .thread-form) {
  border-top-color: #34344b;
}

:global(html[data-theme='dark'] .thread-form h3) {
  color: #ffffff;
}

:global(html[data-theme='dark'] .thread-form label) {
  color: #c4c4d4;
}

:global(html[data-theme='dark'] .thread-form input),
:global(html[data-theme='dark'] .thread-form textarea) {
  border-color: #34344b;
  background: #11111d;
  color: #ffffff;
}

:global(html[data-theme='dark'] .thread-form input:focus),
:global(html[data-theme='dark'] .thread-form textarea:focus) {
  border-color: #8b5cf6;
  box-shadow:
    0 0 0 3px rgba(139, 92, 246, 0.15);
}

:global(
  html[data-theme='dark']
    .thread-form input::placeholder
),
:global(
  html[data-theme='dark']
    .thread-form textarea::placeholder
) {
  color: #707084;
}

:global(html[data-theme='dark'] .reply-form) {
  border-top-color: #34344b;
}

:global(html[data-theme='dark'] .reply-form textarea) {
  border-color: #34344b;
  background: #11111d;
  color: #ffffff;
}

:global(html[data-theme='dark'] .reply-form textarea:focus) {
  border-color: #8b5cf6;
}

:global(
  html[data-theme='dark']
    .reply-form textarea::placeholder
) {
  color: #707084;
}

</style>