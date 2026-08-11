import type {
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