<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ViewCard from '@/components/ViewCard.vue'
import type { PublicAuthor } from '@/models/author'
import type { PoliticalView } from '@/models/view'
import { getAuthorById } from '@/services/authorsService'
import { getViews } from '@/services/viewsService'

const route = useRoute()
const router = useRouter()

const author = ref<PublicAuthor | null>(null)
const views = ref<PoliticalView[]>([])

const loading = ref(true)
const errorMessage = ref('')

// Carga la información pública del autor y sus publicaciones
const loadAuthorProfile = async (): Promise<void> => {
  loading.value = true
  errorMessage.value = ''

  const authorId = route.params.id

  if (typeof authorId !== 'string' || !authorId) {
    errorMessage.value = 'El autor no es válido.'
    loading.value = false
    return
  }

  try {
    const [authorData, viewsData] = await Promise.all([
      getAuthorById(authorId),
      getViews({
        autorId: authorId,
        page: 1,
        limit: 50,
      }),
    ])

    author.value = authorData
    views.value = viewsData.views ?? []
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

const openView = (viewId: string): void => {
  router.push({
    name: 'view-detail',
    params: {
      id: viewId,
    },
  })
}

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

onMounted(loadAuthorProfile)
</script>

<template>
  <main class="author-page">
    <div class="author-container">
      <!-- Estado de carga -->
      <section
        v-if="loading"
        class="state-card"
      >
        <span class="loader"></span>

        <p>
          Cargando perfil del autor...
        </p>
      </section>

      <!-- Error -->
      <section
        v-else-if="errorMessage"
        class="state-card error-state"
      >
        <div class="state-icon">
          !
        </div>

        <h1>
          No pudimos cargar este perfil
        </h1>

        <p>
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="back-button"
          @click="router.push('/')"
        >
          Volver al tablero
        </button>
      </section>

      <template v-else-if="author">
        <!-- Información del autor -->
        <section class="author-header">
          <div class="author-avatar">
            {{
              author.name
                .charAt(0)
                .toUpperCase()
            }}
          </div>

          <div class="author-info">
            <span class="author-eyebrow">
              PERFIL PÚBLICO
            </span>

            <h1>
              {{ author.name }}
            </h1>

            <p>
              Miembro desde
              {{ formatDate(author.createdAt) }}
            </p>
          </div>

          <div class="author-actions">
            <div class="author-stat">
              <strong>
                {{ author.publishedViewsCount }}
              </strong>

              <span>
                {{
                  author.publishedViewsCount === 1
                    ? 'publicación'
                    : 'publicaciones'
                }}
              </span>
            </div>

            <button
              type="button"
              class="back-button author-back-button"
              @click="router.push({ name: 'tablero' })"
            >
              Volver al tablero
            </button>
          </div>
        </section>

        <!-- Publicaciones -->
        <section class="author-publications">
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">
                PUBLICACIONES
              </span>

              <h2>
                Publicaciones de {{ author.name }}
              </h2>
            </div>

            <span class="results-count">
              {{ views.length }}
              {{
                views.length === 1
                  ? 'resultado'
                  : 'resultados'
              }}
            </span>
          </div>

          <!-- Sin publicaciones -->
          <div
            v-if="views.length === 0"
            class="empty-state"
          >
            <div class="empty-icon">
              ✦
            </div>

            <h3>
              Todavía no hay publicaciones
            </h3>

            <p>
              Este autor aún no tiene publicaciones
              disponibles para mostrar.
            </p>
          </div>

          <!-- Lista de publicaciones -->
          <div
            v-else
            class="views-grid"
          >
            <ViewCard
              v-for="view in views"
              :key="view.id"
              :view="view"
              @click="openView(view.id)"
            />
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
/* =========================
   MOBILE FIRST
   Base: móvil
   ========================= */

.author-page {
  min-height: 100vh;
  padding: 24px 14px 50px;
  background: #f7f7fb;
}

.author-container {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* =========================
   AUTOR
   ========================= */

.author-header {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

.author-avatar {
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #7c3aed;
  color: #ffffff;
  font-size: 30px;
  font-weight: 800;
}

.author-info {
  min-width: 0;
  width: 100%;
  flex: 1;
}

.author-eyebrow,
.section-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.author-info h1 {
  margin: 0;
  color: #18181b;
  font-size: 30px;
  line-height: 1.2;
}

.author-info p {
  margin: 7px 0 0;
  color: #71717a;
  font-size: 15px;
  line-height: 1.6;
}

.author-stat {
  box-sizing: border-box;
  width: 100%;
  padding: 16px;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  text-align: center;
}

.author-stat strong {
  display: block;
  color: #7c3aed;
  font-size: 28px;
}

.author-stat span {
  color: #71717a;
  font-size: 13px;
}

/* =========================
   PUBLICACIONES
   ========================= */

.author-publications {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}

.section-heading h2 {
  margin: 0;
  color: #18181b;
  font-size: 24px;
}

.results-count {
  padding: 7px 12px;
  border: 1px solid #e4e4e7;
  border-radius: 999px;
  color: #71717a;
  font-size: 13px;
  font-weight: 700;
}

.author-actions {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;
}

.author-back-button {
  width: 100%;
  margin-top: 0;
  border: 1px solid #7c3aed;
  background: #7c3aed;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.18);
}

.author-back-button:hover {
  border-color: #6d28d9;
  background: #6d28d9;
  color: #ffffff;
}

/* En móvil y tablet usamos una sola columna
   para evitar que ViewCard quede demasiado angosto. */

.views-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

/* =========================
   ESTADOS
   ========================= */

.state-card,
.empty-state {
  padding: 42px 20px;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  background: #ffffff;
  text-align: center;
}

.state-card {
  display: flex;
  min-height: 280px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.state-card p,
.empty-state p {
  color: #71717a;
  font-size: 15px;
  line-height: 1.6;
}

.state-card h1,
.empty-state h3 {
  color: #27272a;
  font-size: 20px;
}

.state-icon,
.empty-icon {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: #ede9fe;
  color: #7c3aed;
  font-size: 16px;
  font-weight: 800;
}

.back-button {
  margin-top: 12px;
  padding: 10px 18px;
  border: 0;
  border-radius: 8px;
  background: #7c3aed;
  color: #ffffff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.back-button:hover {
  background: #6d28d9;
}

.loader {
  width: 28px;
  height: 28px;
  border: 3px solid #ddd6fe;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
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
  .author-page {
    padding: 40px 24px 70px;
  }

  .author-container {
    max-width: 1180px;
  }

  .author-header {
    align-items: center;
    flex-direction: row;
    gap: 20px;
    padding: 28px;
  }

  .author-avatar {
    width: 76px;
    height: 76px;
    font-size: 30px;
  }

  .author-info {
    width: auto;
  }

  .author-info h1 {
    font-size: 32px;
  }

  .author-stat {
    width: auto;
    min-width: 120px;
  }

  .author-publications {
    padding: 28px;
  }

  .author-actions {
  width: auto;
  align-items: stretch;
  }

  .author-back-button {
    width: auto;
  }

  .section-heading {
    align-items: center;
    flex-direction: row;
    gap: 20px;
  }

  .section-heading h2 {
    font-size: 26px;
  }

  .state-card,
  .empty-state {
    padding: 50px 24px;
  }

  /* Tablet continúa con una sola columna */
  .views-grid {
    grid-template-columns: 1fr;
  }
}

/* =========================
   ESCRITORIO
   ========================= */

@media (min-width: 1200px) {
  .author-page {
    padding: 50px 32px 80px;
  }

  .author-container {
    max-width: 1450px;
  }

  .views-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

/* =========================
   PANTALLAS GRANDES
   ========================= */

@media (min-width: 1600px) {
  .author-container {
    max-width: 1500px;
  }
}

/* =========================
   PANTALLAS MUY GRANDES
   ========================= */

@media (min-width: 1750px) {
  .views-grid {
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
  }
}

/* =========================
   TEMA OSCURO
   ========================= */

:global(html[data-theme='dark'] .author-page) {
  background: #0f0f1a;
}

:global(html[data-theme='dark'] .author-header),
:global(html[data-theme='dark'] .author-publications),
:global(html[data-theme='dark'] .state-card),
:global(html[data-theme='dark'] .empty-state) {
  border-color: #2d2d42;
  background: #171726;
}

:global(html[data-theme='dark'] .author-info h1),
:global(html[data-theme='dark'] .section-heading h2),
:global(html[data-theme='dark'] .state-card h1),
:global(html[data-theme='dark'] .empty-state h3) {
  color: #ffffff;
}

:global(html[data-theme='dark'] .author-info p),
:global(html[data-theme='dark'] .author-stat span),
:global(html[data-theme='dark'] .results-count),
:global(html[data-theme='dark'] .state-card p),
:global(html[data-theme='dark'] .empty-state p) {
  color: #a9a9bd;
}

:global(html[data-theme='dark'] .author-stat),
:global(html[data-theme='dark'] .results-count) {
  border-color: #34344b;
}

:global(html[data-theme='dark'] .author-back-button) {
  border-color: #8b5cf6;
  background: #7c3aed;
  color: #ffffff;
}

:global(html[data-theme='dark'] .author-back-button:hover) {
  border-color: #a78bfa;
  background: #8b5cf6;
  color: #ffffff;
}
</style>