import type { PoliticalView } from '@/models/view'
import type { ViewFormPayload } from '@/models/viewForm'
import {
  removeCacheByPrefix,
} from '@/utils/cache'

const API_URL = import.meta.env.VITE_API_URL
const VIEWS_CACHE_PREFIX = 'views:'

interface ViewMutationResponse {
  view: PoliticalView
}

// Error propio para poder identificar el código HTTP desde la pantalla
export class ViewEditorError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ViewEditorError'
    this.status = status
  }
}

// Crea una nueva publicación
export const createView = async (
  payload: ViewFormPayload,
  token: string,
): Promise<PoliticalView> => {
  try {
    const response = await fetch(
      `${API_URL}/api/views`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    )

    if (response.status === 400) {
      throw new ViewEditorError(
        400,
        'Revise los datos ingresados.',
      )
    }

    if (response.status === 401) {
      throw new ViewEditorError(
        401,
        'Su sesión ha expirado.',
      )
    }

    if (response.status === 403) {
      throw new ViewEditorError(
        403,
        'No tiene permiso para publicar.',
      )
    }

    if (response.status === 422) {
      throw new ViewEditorError(
        422,
        'Algunos datos de la publicación no son válidos.',
      )
    }

    if (!response.ok) {
      throw new ViewEditorError(
        response.status,
        'No fue posible crear la publicación.',
      )
    }

    const data =
      (await response.json()) as ViewMutationResponse

      removeCacheByPrefix(VIEWS_CACHE_PREFIX)

    return data.view
  } catch (error) {
    if (error instanceof ViewEditorError) {
      throw error
    }

    if (error instanceof TypeError) {
      throw new ViewEditorError(
        0,
        'No fue posible conectar con el servidor.',
      )
    }

    throw new ViewEditorError(
      0,
      'Ocurrió un error inesperado.',
    )
  }
}

  // Obtiene una publicación para cargarla en el formulario de edición
    export const getViewForEditing = async (
    viewId: string,
    token: string,
    ): Promise<PoliticalView> => {
    try {
        const response = await fetch(
        `${API_URL}/api/views/${viewId}`,
        {
            headers: {
            Authorization: `Bearer ${token}`,
            },
        },
        )

        if (response.status === 401) {
        throw new ViewEditorError(
            401,
            'Su sesión ha expirado.',
        )
        }

        if (response.status === 404) {
        throw new ViewEditorError(
            404,
            'La publicación no fue encontrada.',
        )
        }

        if (!response.ok) {
        throw new ViewEditorError(
            response.status,
            'No fue posible cargar la publicación.',
        )
        }

        const data =
        (await response.json()) as ViewMutationResponse

        return data.view
    } catch (error) {
        if (error instanceof ViewEditorError) {
        throw error
        }

        if (error instanceof TypeError) {
        throw new ViewEditorError(
            0,
            'No fue posible conectar con el servidor.',
        )
        }

        throw new ViewEditorError(
        0,
        'Ocurrió un error inesperado.',
        )
    }
}
    // Actualiza una publicación existente
    export const updateView = async (
    viewId: string,
    payload: ViewFormPayload,
    token: string,
    ): Promise<PoliticalView> => {
    try {
        const response = await fetch(
        `${API_URL}/api/views/${viewId}`,
        {
            method: 'PUT',
            headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        },
        )

        if (response.status === 400) {
        throw new ViewEditorError(
            400,
            'Revise los datos ingresados.',
        )
        }

        if (response.status === 401) {
        throw new ViewEditorError(
            401,
            'Su sesión ha expirado.',
        )
        }

        if (response.status === 403) {
        throw new ViewEditorError(
            403,
            'Solo el autor puede editar esta publicación.',
        )
        }

        if (response.status === 404) {
        throw new ViewEditorError(
            404,
            'La publicación no fue encontrada.',
        )
        }

        if (!response.ok) {
        throw new ViewEditorError(
            response.status,
            'No fue posible actualizar la publicación.',
        )
        }

        const data =
        (await response.json()) as ViewMutationResponse

        removeCacheByPrefix(VIEWS_CACHE_PREFIX)

        return data.view
    } catch (error) {
        if (error instanceof ViewEditorError) {
        throw error
        }

        if (error instanceof TypeError) {
        throw new ViewEditorError(
            0,
            'No fue posible conectar con el servidor.',
        )
        }

        throw new ViewEditorError(
        0,
        'Ocurrió un error inesperado.',
        )
    }
}