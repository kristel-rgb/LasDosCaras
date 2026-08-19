import type {
  PoliticalView,
  ReactionType,
  ViewReactionResponse,
  ViewSideType,
  ViewsResponse,
} from '@/models/view'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

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

  try {
    const response = await fetch(url, {
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

    return await response.json()
  } catch (error) {
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
  try {
    const response = await fetch(
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

    return await response.json()
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
    const response = await fetch(
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

    return await response.json()
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