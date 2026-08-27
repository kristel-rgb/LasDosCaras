import {
  getCache,
  getStaleCache,
  notifyStaleCacheUsage,
  setCache,
} from '@/utils/cache'

import {
  apiFetch,
} from '@/utils/network'

const API_URL =
  import.meta.env.VITE_API_URL

const HASHTAGS_CACHE_KEY =
  'hashtags'

const HASHTAGS_CACHE_TTL =
  30 * 60 * 1000 // 30 minutos

export interface Hashtag {
  id: string
  name: string
}

interface HashtagsResponse {
  hashtags: Hashtag[]
}

const fetchAndCacheHashtags =
  async (): Promise<HashtagsResponse> => {
    const response = await apiFetch(
      `${API_URL}/api/hashtags`,
    )

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar los hashtags.',
      )
    }

    const data =
      await response.json() as HashtagsResponse

    setCache(
      HASHTAGS_CACHE_KEY,
      data,
      HASHTAGS_CACHE_TTL,
    )

    return data
  }

// Cache-first + stale-while-revalidate
export const getHashtags =
  async (): Promise<HashtagsResponse> => {
    const cachedHashtags =
      getCache<HashtagsResponse>(
        HASHTAGS_CACHE_KEY,
      )

    if (cachedHashtags) {
      void fetchAndCacheHashtags()
        .catch(() => {
          // Conservamos el caché si
          // falla la actualización.
        })

      return cachedHashtags
    }

    try {
      return await fetchAndCacheHashtags()
    } catch (error) {
      const staleHashtags =
        getStaleCache<HashtagsResponse>(
          HASHTAGS_CACHE_KEY,
        )

      if (staleHashtags) {
        notifyStaleCacheUsage()

        return staleHashtags
      }

      if (error instanceof Error) {
        throw error
      }

      throw new Error(
        'No fue posible conectar con el servidor.',
      )
    }
  }

// Busca hashtags por texto para autocompletado
export const searchHashtags =
  async (
    query: string,
  ): Promise<HashtagsResponse> => {
    const normalizedQuery =
      query
        .trim()
        .replace(/^#/, '')

    if (!normalizedQuery) {
      return {
        hashtags: [],
      }
    }

    const params =
      new URLSearchParams({
        q: normalizedQuery,
      })

    const response = await apiFetch(
      `${API_URL}/api/hashtags?${params.toString()}`,
    )

    if (!response.ok) {
      throw new Error(
        'No fue posible buscar hashtags.',
      )
    }

    return await response.json()
  }