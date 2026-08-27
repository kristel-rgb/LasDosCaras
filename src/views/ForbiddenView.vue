<script setup lang="ts">
import { useRouter } from 'vue-router'

import AppNavbar from '@/components/AppNavbar.vue'

const router = useRouter()

const goHome = (): void => {
  router.push({
    name: 'tablero',
  })
}
</script>

<template>
  <AppNavbar />

  <main class="error-page">
    <section class="error-card">
      <span class="error-code">
        403
      </span>

      <div class="error-icon" aria-hidden="true">
        !
      </div>

      <h1>
        Acceso denegado
      </h1>

      <p>
        No tienes permisos para acceder a esta sección.
        Esta área está reservada para usuarios con rol
        de superadministrador.
      </p>

      <button
        type="button"
        class="primary-button"
        @click="goHome"
      >
        Volver al tablero
      </button>
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
  color: #b91c1c;
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
  background: #fef2f2;
  color: #b91c1c;
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
  max-width: 430px;
  margin: 0 auto;
  color: #71717a;
  font-size: 15px;
  line-height: 1.7;
}

.primary-button {
  width: 100%;
  margin-top: 28px;
  padding: 11px 18px;
  border: 0;
  border-radius: 9px;
  background: #7c3aed;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s ease;
}

.primary-button:hover {
  background: #6d28d9;
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

  .primary-button {
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
  color: #fca5a5;
}

:global(html[data-theme='dark'] .error-icon) {
  background: #3f1d24;
  color: #fca5a5;
}

:global(html[data-theme='dark'] .error-card h1) {
  color: #f4f4f5;
}

:global(html[data-theme='dark'] .error-card p) {
  color: #a1a1aa;
}
</style>