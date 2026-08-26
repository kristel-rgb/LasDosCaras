import type { ViewThread } from '@/models/thread'
import {
  removeCacheByPrefix,
} from '@/utils/cache'

import {
  apiFetch,
} from '@/utils/network'

// URL base del API
const API_URL = import.meta.env.VITE_API_URL
const VIEWS_CACHE_PREFIX = 'views:'
const VIEW_CACHE_PREFIX = 'view:'

// Obtiene los hilos de una publicación
export const getViewThreads = async (
  viewId: string,
  token?: string,
): Promise<ViewThread[]> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/threads`,
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
        'No se encontraron hilos para esta publicación.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar los comentarios.',
      )
    }

    const data = await response.json()

    return data.threads ?? data
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

// Datos necesarios para crear un hilo
export interface CreateThreadData {
  title: string
  content: string
}

// Crea un nuevo hilo en una publicación
export const createViewThread = async (
  viewId: string,
  threadData: CreateThreadData,
  token: string,
): Promise<ViewThread> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/threads`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(threadData),
      },
    )

    if (response.status === 401) {
      throw new Error(
        'Debes iniciar sesión para crear un hilo.',
      )
    }

    if (response.status === 403) {
      throw new Error(
        'No tienes permiso para crear un hilo.',
      )
    }

    if (response.status === 400) {
      throw new Error(
        'Revisa el título y el contenido del hilo.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible crear el hilo.',
      )
    }

    const data = await response.json()

    removeCacheByPrefix(VIEWS_CACHE_PREFIX)
    removeCacheByPrefix(VIEW_CACHE_PREFIX)

    return data.thread ?? data
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

// Agrega un comentario a un hilo existente
export const createThreadComment = async (
  viewId: string,
  threadId: string,
  content: string,
  token: string,
): Promise<void> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}/threads/${threadId}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
        }),
      },
    )

    if (response.status === 401) {
      throw new Error(
        'Debes iniciar sesión para comentar.',
      )
    }

    if (response.status === 403) {
      throw new Error(
        'No tienes permiso para comentar.',
      )
    }

    if (response.status === 400) {
      throw new Error(
        'El comentario no es válido.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible publicar el comentario.',
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