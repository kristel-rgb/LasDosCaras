import type { ViewThread } from '@/models/thread'

// URL base del API
const API_URL = import.meta.env.VITE_API_URL

// Obtiene los hilos de una publicación
export const getViewThreads = async (
  viewId: string,
  token?: string,
): Promise<ViewThread[]> => {
  try {
    const response = await fetch(
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