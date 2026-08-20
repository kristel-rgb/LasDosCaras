<script setup lang="ts">
import {
  computed,
  ref,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'

import type {
  PoliticalView,
  ViewSide,
} from '@/models/view'

import {
  addFavorite,
  removeFavorite,
} from '@/services/favoritesService'

import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  view: PoliticalView
}>()

const router = useRouter()
const authStore = useAuthStore()

// Estado local del favorito
const isFavorite = ref(props.view.isFavorite)
const favoriteLoading = ref(false)
const favoriteError = ref('')

// Estado para compartir la publicación
const shareMessage = ref('')

// Mantiene sincronizado el estado si cambia la publicación
watch(
  () => props.view.isFavorite,
  (newValue) => {
    isFavorite.value = newValue
  },
)

// Obtiene el lado principal
const sideA = computed<ViewSide | undefined>(() =>
  props.view.sides.find(
    (side) => side.type === 'SIDE',
  ),
)

// Obtiene la contraparte
const sideB = computed<ViewSide | undefined>(() =>
  props.view.sides.find(
    (side) => side.type === 'COUNTERPART',
  ),
)

// Formatea la fecha para mostrarla al usuario
const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(props.view.createdAt))
})

// Agrega o elimina la publicación de favoritos
const toggleFavorite = async (): Promise<void> => {
  // Los favoritos requieren autenticación
  if (
    !authStore.isAuthenticated ||
    !authStore.token
  ) {
    await router.push('/login')
    return
  }

  if (favoriteLoading.value) {
    return
  }

  favoriteLoading.value = true
  favoriteError.value = ''

  try {
    if (isFavorite.value) {
      isFavorite.value = await removeFavorite(
        props.view.id,
        authStore.token,
      )
    } else {
      isFavorite.value = await addFavorite(
        props.view.id,
        authStore.token,
      )
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

// Comparte la publicación o copia el enlace al portapapeles
const shareView = async (): Promise<void> => {
  const title =
    sideA.value?.title ??
    'Publicación de LasDosCaras'

  const shareData = {
    title,
    text: `Mira esta publicación en LasDosCaras: ${title}`,
    url: window.location.href,
  }

  shareMessage.value = ''

  // Primero intenta utilizar el menú nativo del navegador
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData)

      shareMessage.value =
        'Publicación compartida.'

      return
    } catch (error) {
      // Si el usuario cancela, no mostramos error
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return
      }

      // Si compartir falla, continuamos e intentamos copiar
    }
  }

  // Si compartir no está disponible o falla,
  // copiamos el enlace
  try {
    await navigator.clipboard.writeText(
      shareData.url,
    )

    shareMessage.value = 'Enlace copiado.'
  } catch {
    shareMessage.value =
      'No fue posible copiar el enlace.'
  }
}
</script>

<template>
  <article class="view-card">
    <!-- Encabezado -->
    <header class="card-header">
      <div class="author-info">
        <div class="author-avatar">
          {{
            view.author.name
              .charAt(0)
              .toUpperCase()
          }}
        </div>

        <div>
          <p class="author-name">
            {{ view.author.name }}
          </p>

          <p class="publication-date">
            {{ formattedDate }}
          </p>
        </div>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="category-badge"
          @click="
            router.push(
              `/categories/${view.category.id}`,
            )
          "
        >
          {{ view.category.name }}
        </button>

        <!-- Compartir -->
      <button
        class="share-button"
        type="button"
        aria-label="Compartir publicación"
        title="Compartir publicación"
        @click="shareView"
      >
        <span>↗</span>
        Compartir
      </button>

        <!-- Favorito -->
        <button
          v-if="authStore.isAuthenticated"
          class="favorite-button"
          :class="{ active: isFavorite }"
          type="button"
          :disabled="favoriteLoading"
          :aria-pressed="isFavorite"
          :aria-label="
            isFavorite
              ? 'Quitar de favoritos'
              : 'Agregar a favoritos'
          "
          @click="toggleFavorite"
        >
          <span class="favorite-star">
            {{ isFavorite ? '★' : '☆' }}
          </span>

          <span>
            {{
              favoriteLoading
                ? 'Guardando...'
                : isFavorite
                  ? 'Guardado'
                  : 'Guardar'
            }}
          </span>
        </button>
      </div>
    </header>

    <p
      v-if="shareMessage"
      class="share-message"
      role="status"
    >
      {{ shareMessage }}
    </p>

    <!-- Error de favorito -->
    <p
      v-if="favoriteError"
      class="favorite-error"
      role="alert"
    >
      {{ favoriteError }}
    </p>

    <!-- Hashtags -->
    <div
      v-if="view.hashtags.length"
      class="hashtags"
    >
      <span
        v-for="hashtag in view.hashtags"
        :key="hashtag.id"
        class="hashtag"
      >
        #{{ hashtag.name }}
      </span>
    </div>

    <!-- Las dos caras -->
    <div class="sides-container">
      <!-- Lado A -->
      <section
        v-if="sideA"
        class="side side-a"
      >
        <div class="side-label">
          <span class="side-dot"></span>
          LADO A
        </div>

        <h2>
          {{ sideA.title }}
        </h2>

        <p class="side-description">
          {{ sideA.description }}
        </p>

        <footer class="side-stats">
          <span>
            ↑ {{ sideA.likeCount }}
          </span>

          <span>
            ↓ {{ sideA.dislikeCount }}
          </span>
        </footer>
      </section>

      <!-- Separador -->
      <div class="side-divider">
        <span>VS</span>
      </div>

      <!-- Lado B -->
      <section
        v-if="sideB"
        class="side side-b"
      >
        <div class="side-label">
          <span class="side-dot"></span>
          LADO B
        </div>

        <h2>
          {{ sideB.title }}
        </h2>

        <p class="side-description">
          {{ sideB.description }}
        </p>

        <footer class="side-stats">
          <span>
            ↑ {{ sideB.likeCount }}
          </span>

          <span>
            ↓ {{ sideB.dislikeCount }}
          </span>
        </footer>
      </section>
    </div>

    <!-- Pie de tarjeta -->
    <footer class="card-footer">
      <div class="card-stat">
        <span>Opiniones</span>

        <strong>
          {{ view.totalLikes + view.totalDislikes }}
        </strong>
      </div>

      <div class="card-stat">
        <span>Comentarios</span>

        <strong>
          {{ view._count.threads }}
        </strong>
      </div>

      <button
        type="button"
        class="detail-button"
        @click="router.push(`/views/${view.id}`)"
      >
        Ver publicación
        <span aria-hidden="true">→</span>
      </button>

      <div
        v-if="isFavorite"
        class="favorite-indicator"
      >
        ★ Favorito
      </div>
    </footer>
  </article>
</template>

<style scoped>
.view-card {
  width: 100%;
  overflow: hidden;
  border: 1px solid #e8e7ef;
  border-radius: 18px;
  background: #ffffff;
  box-shadow:
    0 8px 30px rgba(15, 16, 32, 0.06);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.view-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 14px 35px rgba(15, 16, 32, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px 14px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  display: flex;
  width: 42px;
  height: 42px;
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

.author-name {
  margin: 0 0 3px;
  color: #18181b;
  font-size: 14px;
  font-weight: 700;
}

.publication-date {
  margin: 0;
  color: #a1a1aa;
  font-size: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.category-badge {
  padding: 7px 11px;
  border: none;
  border-radius: 20px;
  background: #f5f3ff;
  color: #6d28d9;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: 0.2s ease;
}

.category-badge:hover {
  background: #ede9fe;
  color: #5b21b6;
}

/* Compartir */

.share-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
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

.share-button:hover {
  border-color: #c4b5fd;
  background: #faf9ff;
  color: #6d28d9;
}

.share-message {
  margin: 0;
  padding: 0 24px 10px;
  color: #15803d;
  font-size: 11px;
}

/* Favoritos */

.favorite-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
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

.favorite-button:hover:not(:disabled) {
  border-color: #c4b5fd;
  color: #6d28d9;
  background: #faf9ff;
}

.favorite-button.active {
  border-color: #c4b5fd;
  background: #f5f3ff;
  color: #6d28d9;
}

.favorite-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.favorite-star {
  font-size: 15px;
  line-height: 1;
}

.favorite-error {
  margin: 0;
  padding: 0 24px 12px;
  color: #b91c1c;
  font-size: 11px;
}

.hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding: 0 24px 18px;
}

.hashtag {
  color: #6366f1;
  font-size: 12px;
  font-weight: 600;
}

.sides-container {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #eeeef4;
  border-bottom: 1px solid #eeeef4;
}

.side {
  min-width: 0;
  padding: 25px 24px;
}

.side-a {
  background:
    linear-gradient(
      145deg,
      #fafaff,
      #f5f3ff
    );
}

.side-b {
  background:
    linear-gradient(
      145deg,
      #ffffff,
      #fafafa
    );
}

.side-label {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 13px;
  color: #71717a;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.side-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.side-a .side-dot {
  background: #6d28d9;
}

.side-b .side-dot {
  background: #18181b;
}

.side h2 {
  margin: 0 0 12px;
  color: #18181b;
  font-size: 19px;
  line-height: 1.35;
  letter-spacing: -0.3px;
}

.side-description {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #71717a;
  font-size: 13px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.side-stats {
  display: flex;
  gap: 15px;
  margin-top: 20px;
  color: #71717a;
  font-size: 12px;
  font-weight: 700;
}

.side-divider {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: flex;
  width: 35px;
  height: 35px;
  align-items: center;
  justify-content: center;
  border: 3px solid #ffffff;
  border-radius: 50%;
  background: #18181b;
  color: #ffffff;
  font-size: 9px;
  font-weight: 900;
  transform: translate(-50%, -50%);
}

.card-footer {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 25px;
  padding: 0 24px;
}

.card-stat {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #a1a1aa;
  font-size: 11px;
}

.card-stat strong {
  color: #52525b;
  font-size: 12px;
}

/* Botón para abrir el detalle de la publicación */
.detail-button {
  margin-left: auto;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: #6d28d9;
  color: #ffffff;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s ease;
}

.detail-button:hover {
  background: #5b21b6;
}

.favorite-indicator {
  margin-left: auto;
  color: #7c3aed;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 650px) {
  .card-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .header-actions {
    width: 100%;
    align-items: center;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .sides-container {
    grid-template-columns: 1fr;
  }

  .side-divider {
    top: 50%;
  }

  .side-a {
    border-bottom: 1px solid #e8e7ef;
  }

  .card-footer {
    flex-wrap: wrap;
    gap: 14px;
    padding-top: 15px;
    padding-bottom: 15px;
  }
}

/* Tema oscuro */

:global(html[data-theme='dark'] .share-button) {
  border-color: #3f3f55;
  background: #1b1b2d;
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .share-button:hover) {
  border-color: #8b5cf6;
  background: #29243f;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .share-message) {
  color: #86efac;
}

:global(html[data-theme='dark'] .view-card) {
  border-color: #29293d;
  background: #171728;
  box-shadow:
    0 8px 30px rgba(0, 0, 0, 0.25);
}

:global(html[data-theme='dark'] .view-card:hover) {
  box-shadow:
    0 14px 35px rgba(0, 0, 0, 0.35);
}

:global(html[data-theme='dark'] .author-name) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .publication-date) {
  color: #71717a;
}

:global(html[data-theme='dark'] .category-badge) {
  background: #302b4d;
  color: #c4b5fd;
}

/* Favoritos */

:global(html[data-theme='dark'] .favorite-button) {
  border-color: #3f3f55;
  background: #1b1b2d;
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .favorite-button:hover:not(:disabled)) {
  border-color: #8b5cf6;
  background: #29243f;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .favorite-button.active) {
  border-color: #8b5cf6;
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .favorite-error) {
  color: #f87171;
}

:global(html[data-theme='dark'] .hashtag) {
  color: #a78bfa;
}

/* Lados */

:global(html[data-theme='dark'] .sides-container) {
  border-top-color: #29293d;
  border-bottom-color: #29293d;
}

:global(html[data-theme='dark'] .side-a) {
  background:
    linear-gradient(
      145deg,
      #1d1b31,
      #211d37
    );
}

:global(html[data-theme='dark'] .side-b) {
  background:
    linear-gradient(
      145deg,
      #171728,
      #1b1b2d
    );
}

:global(html[data-theme='dark'] .side-label) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .side-a .side-dot) {
  background: #a78bfa;
}

:global(html[data-theme='dark'] .side-b .side-dot) {
  background: #d4d4d8;
}

:global(html[data-theme='dark'] .side h2) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .side-description) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .side-stats) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .side-divider) {
  border-color: #171728;
  background: #f4f4f5;
  color: #18181b;
}

/* Pie */

:global(html[data-theme='dark'] .card-footer) {
  background: #171728;
}

:global(html[data-theme='dark'] .card-stat) {
  color: #71717a;
}

:global(html[data-theme='dark'] .card-stat strong) {
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .detail-button) {
  background: #7c3aed;
  color: #ffffff;
}

:global(html[data-theme='dark'] .detail-button:hover) {
  background: #8b5cf6;
}

:global(html[data-theme='dark'] .favorite-indicator) {
  color: #c4b5fd;
}

@media (max-width: 650px) {
  :global(html[data-theme='dark'] .side-a) {
    border-bottom-color: #29293d;
  }
}
</style>