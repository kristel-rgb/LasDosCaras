import type {
  CategoriesResponse,
} from '@/models/category'

import {
  getCache,
  setCache,
} from '@/utils/cache'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Configuración del caché de categorías
const CATEGORIES_CACHE_KEY = 'categories'

const CATEGORIES_CACHE_TTL =
  5 * 60 * 1000 // 5 minutos

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
      const response = await fetch(
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
      if (error instanceof Error) {
        throw error
      }

      throw new Error(
        'No fue posible conectar con el servidor.',
      )
    }
  }