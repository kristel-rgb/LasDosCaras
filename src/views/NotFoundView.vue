<script setup lang="ts">
import { useRouter } from 'vue-router'

import AppNavbar from '@/components/AppNavbar.vue'

const router = useRouter()

const goHome = (): void => {
  router.push({
    name: 'tablero',
  })
}

const goBack = (): void => {
  router.back()
}
</script>

<template>
  <AppNavbar />

  <main class="error-page">
    <section class="error-card">
      <span class="error-code">
        404
      </span>

      <div class="error-icon" aria-hidden="true">
        ?
      </div>

      <h1>
        Página no encontrada
      </h1>

      <p>
        La dirección que intentaste abrir no existe
        o ya no está disponible.
      </p>

      <div class="error-actions">
        <button
          type="button"
          class="primary-button"
          @click="goHome"
        >
          Volver al tablero
        </button>

        <button
          type="button"
          class="secondary-button"
          @click="goBack"
        >
          Regresar
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* =========================
   MOBILE FIRST
   Base: móvil
   ========================= */

.error-page {
  display: flex;
  min-height: calc(100vh - 72px);
  align-items: center;
  justify-content: center;
  padding: 24px 14px;
  background: #f7f7fb;
}

.error-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 560px;
  padding: 34px 20px;
  border: 1px solid #e4e4e7;
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 18px 45px rgba(15, 16, 32, 0.08);
  text-align: center;
}

.error-code {
  display: inline-block;
  margin-bottom: 16px;
  color: #7c3aed;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.error-icon {
  display: flex;
  width: 68px;
  height: 68px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: #ede9fe;
  color: #7c3aed;
  font-size: 30px;
  font-weight: 900;
}

.error-card h1 {
  margin: 0 0 12px;
  color: #18181b;
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: -0.7px;
}

.error-card p {
  max-width: 420px;
  margin: 0 auto;
  color: #71717a;
  font-size: 15px;
  line-height: 1.7;
}

/* =========================
   Acciones
   ========================= */

.error-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.primary-button,
.secondary-button {
  width: 100%;
  padding: 11px 18px;
  border-radius: 9px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.primary-button {
  border: 0;
  background: #7c3aed;
  color: #ffffff;
}

.primary-button:hover {
  background: #6d28d9;
}

.secondary-button {
  border: 1px solid #e4e4e7;
  background: #ffffff;
  color: #52525b;
}

.secondary-button:hover {
  border-color: #c4b5fd;
  background: #faf9ff;
  color: #6d28d9;
}

/* =========================
   TABLET EN ADELANTE
   ========================= */

@media (min-width: 521px) {
  .error-page {
    padding: 40px 24px;
  }

  .error-card {
    padding: 46px 36px;
  }

  .error-icon {
    width: 72px;
    height: 72px;
    font-size: 32px;
  }

  .error-card h1 {
    font-size: 32px;
  }

  .error-actions {
    flex-direction: row;
  }

  .primary-button,
  .secondary-button {
    width: auto;
  }
}

/* =========================
   TEMA OSCURO
   ========================= */

:global(html[data-theme='dark'] .error-page) {
  background: #0f1020;
}

:global(html[data-theme='dark'] .error-card) {
  border-color: #29293d;
  background: #171728;
}

:global(html[data-theme='dark'] .error-code) {
  color: #a78bfa;
}

:global(html[data-theme='dark'] .error-icon) {
  background: #302b4d;
  color: #c4b5fd;
}

:global(html[data-theme='dark'] .error-card h1) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .error-card p) {
  color: #a1a1aa;
}

:global(html[data-theme='dark'] .secondary-button) {
  border-color: #343447;
  background: #1b1b2d;
  color: #d4d4d8;
}

:global(html[data-theme='dark'] .secondary-button:hover) {
  border-color: #8b5cf6;
  background: #29243f;
  color: #c4b5fd;
}
</style>