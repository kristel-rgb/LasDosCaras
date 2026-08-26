import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

let nextToastId = 1

export const useToastStore = defineStore(
  'toast',
  () => {
    const toasts = ref<Toast[]>([])

    const removeToast = (
      id: number,
    ): void => {
      toasts.value =
        toasts.value.filter(
          (toast) => toast.id !== id,
        )
    }

    const showToast = (
      message: string,
      type: ToastType = 'info',
      duration = 3500,
    ): number => {
      const id = nextToastId++

      toasts.value.push({
        id,
        message,
        type,
        duration,
      })

      if (duration > 0) {
        window.setTimeout(() => {
          removeToast(id)
        }, duration)
      }

      return id
    }

    const success = (
      message: string,
      duration = 2500,
    ): number => {
      return showToast(
        message,
        'success',
        duration,
      )
    }

    const error = (
      message: string,
      duration = 4500,
    ): number => {
      return showToast(
        message,
        'error',
        duration,
      )
    }

    const warning = (
      message: string,
      duration = 4000,
    ): number => {
      return showToast(
        message,
        'warning',
        duration,
      )
    }

    const info = (
      message: string,
      duration = 3000,
    ): number => {
      return showToast(
        message,
        'info',
        duration,
      )
    }

    return {
      toasts,
      removeToast,
      showToast,
      success,
      error,
      warning,
      info,
    }
  },
)