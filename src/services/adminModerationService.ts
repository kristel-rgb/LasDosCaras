import type { PoliticalView } from '@/models/view'
import {
  removeCacheByPrefix,
} from '@/utils/cache'

import {
  apiFetch,
} from '@/utils/network'

const API_URL = import.meta.env.VITE_API_URL
const VIEWS_CACHE_PREFIX = 'views:'
const VIEW_CACHE_PREFIX = 'view:'

export type AdminViewStatus =
  | 'PUBLISHED'
  | 'UNPUBLISHED'

export interface AdminViewsResponse {
  total: number
  page: number
  limit: number
  views: PoliticalView[]
}

export interface AdminViewsQuery {
  status?: AdminViewStatus
  page?: number
  limit?: number
}

// Obtiene las publicaciones disponibles para moderación
export const getAdminViews = async (
  token: string,
  query: AdminViewsQuery = {},
): Promise<AdminViewsResponse> => {
  const params = new URLSearchParams()

  if (query.status) {
    params.set('status', query.status)
  }

  params.set(
    'page',
    String(query.page ?? 1),
  )

  params.set(
    'limit',
    String(query.limit ?? 20),
  )

  try {
    const response = await apiFetch(
      `${API_URL}/api/admin/views?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (response.status === 401) {
      throw new Error(
        'Debes iniciar sesión.',
      )
    }

    if (response.status === 403) {
      throw new Error(
        'No tienes permiso para acceder a moderación.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar las publicaciones.',
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

export const publishAdminView = async (
  viewId: string,
  token: string,
): Promise<PoliticalView> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/publish`,
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
        'No tienes permiso para republicar esta publicación.',
      )
    }

    if (response.status === 404) {
      throw new Error(
        'La publicación no fue encontrada.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible republicar la publicación.',
      )
    }

    const data = await response.json()

    removeCacheByPrefix(VIEWS_CACHE_PREFIX)
    removeCacheByPrefix(VIEW_CACHE_PREFIX)

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