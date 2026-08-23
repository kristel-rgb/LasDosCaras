<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <div
    class="toast-container"
    aria-live="polite"
    aria-atomic="true"
  >
    <TransitionGroup
      name="toast"
      tag="div"
      class="toast-list"
    >
      <article
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
        :role="
          toast.type === 'error'
            ? 'alert'
            : 'status'
        "
      >
        <div class="toast-icon">
          <span v-if="toast.type === 'success'">
            ✓
          </span>

          <span v-else-if="toast.type === 'error'">
            !
          </span>

          <span v-else-if="toast.type === 'warning'">
            !
          </span>

          <span v-else>
            i
          </span>
        </div>

        <p>
          {{ toast.message }}
        </p>

        <button
          type="button"
          class="toast-close"
          aria-label="Cerrar notificación"
          @click="
            toastStore.removeToast(
              toast.id,
            )
          "
        >
          ×
        </button>
      </article>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 90px;
  right: 12px;
  left: 12px;
  z-index: 1000;
  width: auto;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  display: grid;
  grid-template-columns:
    auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 16px 36px rgba(15, 16, 32, 0.14);
  pointer-events: auto;
}

.toast-icon {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 15px;
  font-weight: 900;
}

.toast p {
  margin: 0;
  color: #3f3f46;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
}

.toast-close {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #71717a;
  font-family: inherit;
  font-size: 22px;
  cursor: pointer;
}

.toast-close:hover {
  background: #f4f4f5;
  color: #27272a;
}

.toast-success {
  border-left: 4px solid #16a34a;
}

.toast-success .toast-icon {
  background: #dcfce7;
  color: #15803d;
}

.toast-error {
  border-left: 4px solid #dc2626;
}

.toast-error .toast-icon {
  background: #fee2e2;
  color: #b91c1c;
}

.toast-warning {
  border-left: 4px solid #d97706;
}

.toast-warning .toast-icon {
  background: #fef3c7;
  color: #b45309;
}

.toast-info {
  border-left: 4px solid #7c3aed;
}

.toast-info .toast-icon {
  background: #ede9fe;
  color: #6d28d9;
}

/* Animación */

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Mobile first */

@media (min-width: 521px) {
  .toast-container {
    top: 88px;
    right: 18px;
    left: auto;
    width: min(420px, calc(100vw - 32px));
  }

  .toast {
    padding: 16px 16px 16px 18px;
  }
}

/* Tema oscuro */

:global(
  html[data-theme='dark']
  .toast
) {
  border-color: #343447;
  background: #1b1b2d;
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.35);
}

:global(
  html[data-theme='dark']
  .toast p
) {
  color: #e4e4e7;
}

:global(
  html[data-theme='dark']
  .toast-close
) {
  color: #a1a1aa;
}

:global(
  html[data-theme='dark']
  .toast-close:hover
) {
  background: #29293f;
  color: #f4f4f5;
}
</style>