import type {
  PoliticalView,
  ReactionType,
  ViewReactionResponse,
  ViewSideType,
  ViewsResponse,
} from '@/models/view'

import {
  getCache,
  getStaleCache,
  removeCacheByPrefix,
  setCache,
} from '@/utils/cache'

import {
  apiFetch,
  OfflineError,
} from '@/utils/network'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

const VIEWS_CACHE_PREFIX = 'views:'
const VIEW_CACHE_PREFIX = 'view:'

const VIEWS_CACHE_TTL =
  2 * 60 * 1000 // 2 minutos

// Parámetros opcionales disponibles para consultar publicaciones
export interface ViewsQuery {
  category?: string
  hashtag?: string
  sort?: 'likes' | 'dislikes' | 'recent'
  page?: number
  limit?: number
  autorId?: string
  autor?: 'me'
}

// Obtiene las publicaciones del tablero principal
export const getViews = async (
  query: ViewsQuery = {},
  token?: string,
): Promise<ViewsResponse> => {
  const params = new URLSearchParams()

  if (query.category) {
    params.set('category', query.category)
  }

  if (query.hashtag) {
    params.set('hashtag', query.hashtag)
  }

  if (query.sort) {
    params.set('sort', query.sort)
  }

  if (query.page) {
    params.set('page', String(query.page))
  }

  if (query.limit) {
    params.set('limit', String(query.limit))
  }

  if (query.autorId) {
    params.set('autorId', query.autorId)
  }

  if (query.autor) {
    params.set('autor', query.autor)
  }

  const queryString = params.toString()

  const url = queryString
    ? `${API_URL}/api/views?${queryString}`
    : `${API_URL}/api/views`

    const cacheScope =
      token ? 'auth' : 'public'

    const cacheKey =
      `${VIEWS_CACHE_PREFIX}${cacheScope}:${queryString || 'all'}`

    // Solamente usamos el caché para consultas públicas.
    // Las respuestas autenticadas contienen información
    // específica del usuario, como favoritos y reacciones.
    if (!token) {
      const cachedViews =
        getCache<ViewsResponse>(cacheKey)

      if (cachedViews) {
        return cachedViews
      }
    }
  try {
    const response = await apiFetch(url, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    })

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar las publicaciones.',
      )
    }

    const data =
      await response.json() as ViewsResponse

    setCache(
      cacheKey,
      data,
      VIEWS_CACHE_TTL,
    )
    return data

  } catch (error) {
    if (
      error instanceof OfflineError ||
      error instanceof TypeError
    ) {
      const staleViews =
        getStaleCache<ViewsResponse>(
          cacheKey,
        )

      if (staleViews) {
        return staleViews
      }
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error(
      'No fue posible conectar con el servidor.',
    )
  }
}

// Obtiene una publicación específica por su ID
export const getViewById = async (
  viewId: string,
  token?: string,
): Promise<PoliticalView> => {
  const cacheScope =
    token ? 'auth' : 'public'

  const cacheKey =
    `${VIEW_CACHE_PREFIX}${cacheScope}:${viewId}`

  // Online, solo reutilizamos caché fresca
  // para consultas públicas.
  if (!token) {
    const cachedView =
      getCache<PoliticalView>(cacheKey)

    if (cachedView) {
      return cachedView
    }
  }

  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}`,
      {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      },
    )

    if (response.status === 404) {
      throw new Error(
        'La publicación no fue encontrada.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar la publicación.',
      )
    }

    const data: {
      view: PoliticalView
    } = await response.json()

    // Guardamos también respuestas autenticadas
    // para poder usarlas como respaldo offline.
    setCache(
      cacheKey,
      data.view,
      VIEWS_CACHE_TTL,
    )

    return data.view
  } catch (error) {
    if (
      error instanceof OfflineError ||
      error instanceof TypeError
    ) {
      const staleView =
        getStaleCache<PoliticalView>(
          cacheKey,
        )

      if (staleView) {
        return staleView
      }
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error(
      'Ocurrió un error inesperado.',
    )
  }
}

// Registra un like o dislike en uno de los lados de una publicación
export const reactToViewSide = async (
  viewId: string,
  side: ViewSideType,
  reaction: ReactionType,
  token: string,
): Promise<ViewReactionResponse> => {
  const sidePath =
    side === 'SIDE'
      ? 'a'
      : 'b'

  const reactionPath =
    reaction === 'LIKE'
      ? 'like'
      : 'dislike'

  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/sides/${sidePath}/${reactionPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 401) {
      throw new Error(
        'Debes iniciar sesión para reaccionar.',
      )
    }

    if (response.status === 403) {
      throw new Error(
        'No tienes permiso para realizar esta acción.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible registrar tu reacción.',
      )
    }

    const data =
      await response.json() as ViewReactionResponse

    removeCacheByPrefix(VIEWS_CACHE_PREFIX)
    removeCacheByPrefix(VIEW_CACHE_PREFIX)

    return data
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'No fue posible conectar con el servidor.',
      )
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error(
      'Ocurrió un error inesperado.',
    )
  }
}

// Despublica una publicación.
// Esta acción solamente está permitida para SUPERADMIN.
export const unpublishViewById = async (
  viewId: string,
  token: string,
): Promise<PoliticalView> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/unpublish`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 401) {
      throw new Error(
        'La sesión ha expirado.',
      )
    }

    if (response.status === 403) {
      throw new Error(
        'No tienes permiso para despublicar esta publicación.',
      )
    }

    if (response.status === 404) {
      throw new Error(
        'La publicación no fue encontrada.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible despublicar la publicación.',
      )
    }

    const data = await response.json()

    removeCacheByPrefix(VIEWS_CACHE_PREFIX)
    removeCacheByPrefix(VIEW_CACHE_PREFIX)

    // La API puede devolver { view: {...} }
    return data.view ?? data
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'No fue posible conectar con el servidor.',
      )
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error(
      'Ocurrió un error inesperado.',
    )
  }
}