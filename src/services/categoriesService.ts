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
} from '@/utils/network'

const API_URL =
  import.meta.env.VITE_API_URL

const CATEGORIES_CACHE_KEY =
  'categories'

const CATEGORIES_CACHE_TTL =
  60 * 60 * 1000 // 1 hora

const fetchAndCacheCategories =
  async (): Promise<CategoriesResponse> => {
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

    setCache(
      CATEGORIES_CACHE_KEY,
      data,
      CATEGORIES_CACHE_TTL,
    )

    return data
  }

// Cache-first + stale-while-revalidate
export const getCategories =
  async (): Promise<CategoriesResponse> => {
    const cachedCategories =
      getCache<CategoriesResponse>(
        CATEGORIES_CACHE_KEY,
      )

    // Si hay caché vigente, se muestra
    // inmediatamente y se actualiza en segundo plano.
    if (cachedCategories) {
      void fetchAndCacheCategories()
        .catch(() => {
          // La información en caché continúa
          // disponible si falla la actualización.
        })

      return cachedCategories
    }

    try {
      return await fetchAndCacheCategories()
    } catch (error) {
      // Si la API falla, usamos incluso
      // información vencida como respaldo.
      const staleCategories =
        getStaleCache<CategoriesResponse>(
          CATEGORIES_CACHE_KEY,
        )

      if (staleCategories) {
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