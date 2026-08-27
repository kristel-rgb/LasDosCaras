import {
  apiFetch,
} from '@/utils/network'

import {
  getStorage,
  removeStorage,
  setStorage,
} from '@/utils/cache'

// IDs de publicaciones favoritas del usuario
export interface FavoritesResponse {
  favorites: string[]
}

// Entrada guardada en el historial local
export interface HistoryEntry {
  id: string
  titulo: string
  categoria: string
  fechaVista: string
}

const API_URL = import.meta.env.VITE_API_URL

// Obtiene los IDs de favoritos del usuario autenticado
export const getMyFavoriteIds = async (
  token: string,
): Promise<string[]> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/users/me/favorites`,
      {
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

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar tus favoritos.',
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

// Elimina una publicación de favoritos
export const removeProfileFavorite = async (
  viewId: string,
  token: string,
): Promise<void> => {
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
      throw new Error(
        'La sesión ha expirado.',
      )
    }

    if (response.status === 404) {
      throw new Error(
        'La publicación no fue encontrada.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible eliminar el favorito.',
      )
    }
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

// Obtiene el historial local
export const getLocalHistory =
  (): HistoryEntry[] => {
    const stored =
      getStorage<HistoryEntry[]>(
        'lasdoscaras_history',
      )

    return Array.isArray(stored)
      ? stored
      : []
  }

export const saveHistoryEntry = (
  entry: Omit<HistoryEntry, 'fechaVista'>,
): void => {
  try {
    const history = getLocalHistory()

    const filteredHistory =
      history.filter(
        (item) => item.id !== entry.id,
      )

    filteredHistory.unshift({
      ...entry,
      fechaVista: new Date().toISOString(),
    })

    setStorage(
      'lasdoscaras_history',
      filteredHistory.slice(0, 20),
    )
  } catch {
    // El historial no debe impedir
    // cargar una publicación.
  }
}

// Limpia el historial local
export const clearLocalHistory =
  (): void => {
    removeStorage(
      'lasdoscaras_history',
    )
}