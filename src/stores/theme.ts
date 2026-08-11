import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

// Store global encargado del tema de la aplicación
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')

  // Aplica el tema al documento
  const applyTheme = (newTheme: Theme): void => {
    theme.value = newTheme

    document.documentElement.setAttribute(
      'data-theme',
      newTheme,
    )

    localStorage.setItem(
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

  // Recupera el tema guardado al iniciar la aplicación
  const restoreTheme = (): void => {
    const storedTheme =
      localStorage.getItem('lasdoscaras_theme')

    if (
      storedTheme === 'light' ||
      storedTheme === 'dark'
    ) {
      applyTheme(storedTheme)
      return
    }

    applyTheme('light')
  }

  return {
    theme,
    applyTheme,
    toggleTheme,
    restoreTheme,
  }
})