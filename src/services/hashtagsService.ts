import {
  getCache,
  getStaleCache,
  setCache,
} from '@/utils/cache'

import {
  apiFetch,
  OfflineError,
} from '@/utils/network'

const API_URL = import.meta.env.VITE_API_URL

const HASHTAGS_CACHE_KEY = 'hashtags'

const HASHTAGS_CACHE_TTL =
  30 * 60 * 1000 // 30 minutos

export interface Hashtag {
  id: string
  name: string
}

interface HashtagsResponse {
  hashtags: Hashtag[]
}

export const getHashtags =
  async (): Promise<HashtagsResponse> => {
    const cachedHashtags =
      getCache<HashtagsResponse>(
        HASHTAGS_CACHE_KEY,
      )

    if (cachedHashtags) {
      return cachedHashtags
    }

    try {
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
    } catch (error) {
      const staleHashtags =
        getStaleCache<HashtagsResponse>(
          HASHTAGS_CACHE_KEY,
        )

      if (
        staleHashtags &&
        (
          error instanceof OfflineError ||
          error instanceof TypeError
        )
      ) {
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