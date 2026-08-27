<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
} from 'vue'

import {
  removeCache,
  removeCacheByPrefix,
} from '@/utils/cache'

import ToastContainer from '@/components/ToastContainer.vue'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

let offlineToastId: number | null = null

const showOfflineToast = (): void => {
  if (offlineToastId !== null) {
    return
  }

  offlineToastId = toastStore.warning(
    'Mostrando información guardada — sin conexión al servidor.',
    0,
  )
}

const handleOffline = (): void => {
  showOfflineToast()
}

const handleStaleCache = (): void => {
  showOfflineToast()
}

const handleOnline = (): void => {
  if (offlineToastId !== null) {
    toastStore.removeToast(offlineToastId)
    offlineToastId = null
  }

  // Eliminamos datos públicos cacheados para que
  // al recuperar conexión se consulten nuevamente.
  removeCache('categories')
  removeCacheByPrefix('views:')
  removeCacheByPrefix('view:')

  toastStore.success(
    'Conexión restaurada. Actualizando datos...',
  )

  window.setTimeout(() => {
    window.location.reload()
  }, 1200)
}

onMounted(() => {
  window.addEventListener(
    'offline',
    handleOffline,
  )

  window.addEventListener(
    'online',
    handleOnline,
  )

  window.addEventListener(
    'lasdoscaras:stale-cache',
    handleStaleCache,
  )

  if (!navigator.onLine) {
    showOfflineToast()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'offline',
    handleOffline,
  )

  window.removeEventListener(
    'online',
    handleOnline,
  )

  window.removeEventListener(
    'lasdoscaras:stale-cache',
    handleStaleCache,
  )
})
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>