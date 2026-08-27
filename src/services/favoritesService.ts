import {
  apiFetch,
} from '@/utils/network'

import {
  setStorage,
} from '@/utils/cache'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Respuesta del endpoint de favoritos del usuario
interface FavoritesResponse {
  favorites: string[]
}

// Respuesta al agregar o quitar un favorito
interface FavoriteStatusResponse {
  isFavorite: boolean
}

// Obtiene los favoritos del usuario autenticado
export const getMyFavorites = async (
  token: string,
): Promise<string[]> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/users/me/favorites`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 401) {
      throw new Error('La sesión ha expirado.')
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar los favoritos.',
      )
    }

    const data: FavoritesResponse =
      await response.json()

    return data.favorites
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

// Agrega una publicación a favoritos
export const addFavorite = async (
  viewId: string,
  token: string,
): Promise<boolean> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/favorite`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 401) {
      throw new Error('La sesión ha expirado.')
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible agregar el favorito.',
      )
    }

    const data: FavoriteStatusResponse =
      await response.json()

    return data.isFavorite
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

// Elimina una publicación de favoritos
export const removeFavorite = async (
  viewId: string,
  token: string,
): Promise<boolean> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/favorite`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 401) {
      throw new Error('La sesión ha expirado.')
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible eliminar el favorito.',
      )
    }

    const data: FavoriteStatusResponse =
      await response.json()

    return data.isFavorite
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
export const saveFavoriteIds = (
  favorites: string[],
): void => {
  setStorage(
    'lasdoscaras_favorites',
    favorites,
  )
}