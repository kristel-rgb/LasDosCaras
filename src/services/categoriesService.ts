import type {
  CategoriesResponse,
} from '@/models/category'

import {
  getCache,
  getStaleCache,
  setCache,
} from '@/utils/cache'

import {
  apiFetch,
  OfflineError,
} from '@/utils/network'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Configuración del caché de categorías
const CATEGORIES_CACHE_KEY = 'categories'

const CATEGORIES_CACHE_TTL =
  60 * 60 * 1000 // 1 hora

// Obtiene todas las categorías disponibles
export const getCategories =
  async (): Promise<CategoriesResponse> => {
    // Primero intentamos obtener las categorías
    // desde localStorage.
    const cachedCategories =
      getCache<CategoriesResponse>(
        CATEGORIES_CACHE_KEY,
      )

    if (cachedCategories) {
      return cachedCategories
    }

    try {
      const response = await apiFetch(
        `${API_URL}/api/categories`,
      )

      if (!response.ok) {
        throw new Error(
          'No fue posible cargar las categorías.',
        )
      }

      const data =
        await response.json() as CategoriesResponse

      // Guardamos la respuesta durante 5 minutos.
      setCache(
        CATEGORIES_CACHE_KEY,
        data,
        CATEGORIES_CACHE_TTL,
      )

      return data
    } catch (error) {
      const staleCategories =
        getStaleCache<CategoriesResponse>(
          CATEGORIES_CACHE_KEY,
        )

      if (
        staleCategories &&
        (
          error instanceof OfflineError ||
          error instanceof TypeError
        )
      ) {
        return staleCategories
      }

      if (error instanceof Error) {
        throw error
      }

      throw new Error(
        'No fue posible conectar con el servidor.',
      )
    }
  }