import {
  defineStore,
} from 'pinia'

import {
  ref,
} from 'vue'

import {
  getStorage,
  setStorage,
} from '@/utils/cache'

export type Theme =
  'light' | 'dark'

// Store global encargado del tema
// de la aplicación
export const useThemeStore =
  defineStore(
    'theme',
    () => {
      const theme =
        ref<Theme>('light')

      // Aplica el tema al documento
      const applyTheme = (
        newTheme: Theme,
      ): void => {
        theme.value = newTheme

        document.documentElement
          .setAttribute(
            'data-theme',
            newTheme,
          )

        setStorage(
          'lasdoscaras_theme',
          newTheme,
        )
      }

      // Cambia entre tema claro y oscuro
      const toggleTheme = (): void => {
        applyTheme(
          theme.value === 'light'
            ? 'dark'
            : 'light',
        )
      }

      // Recupera el tema guardado.
      // Si no existe, respeta la
      // preferencia del sistema.
      const restoreTheme = (): void => {
        const storedTheme =
          getStorage<Theme>(
            'lasdoscaras_theme',
          )

        if (
          storedTheme === 'light' ||
          storedTheme === 'dark'
        ) {
          applyTheme(storedTheme)
          return
        }

        const prefersDark =
          window.matchMedia(
            '(prefers-color-scheme: dark)',
          ).matches

        applyTheme(
          prefersDark
            ? 'dark'
            : 'light',
        )
      }

      return {
        theme,
        applyTheme,
        toggleTheme,
        restoreTheme,
      }
    },
  )