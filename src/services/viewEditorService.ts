import type {
  PoliticalView,
} from '@/models/view'

import type {
  ViewFormPayload,
} from '@/models/viewForm'

import {
  removeCache,
  removeCacheByPrefix,
} from '@/utils/cache'

import {
  apiFetch,
} from '@/utils/network'

const API_URL =
  import.meta.env.VITE_API_URL

const VIEWS_CACHE_PREFIX = 'views:'
const VIEW_CACHE_PREFIX = 'view:'

interface ViewMutationResponse {
  view: PoliticalView
}

interface ApiErrorDetails {
  formErrors?: string[]
  fieldErrors?: Record<
    string,
    string[] | undefined
  >
}

interface ApiErrorResponse {
  error?: string
  details?: ApiErrorDetails
}

export class ViewEditorError
  extends Error {
  status: number
  details?: ApiErrorDetails

  constructor(
    status: number,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super(message)
    this.name = 'ViewEditorError'
    this.status = status
    this.details = details
  }
}

const readErrorResponse = async (
  response: Response,
): Promise<ApiErrorResponse> => {
  try {
    return (
      await response.json()
    ) as ApiErrorResponse
  } catch {
    return {}
  }
}

const getValidationMessage = (
  data: ApiErrorResponse,
  fallback: string,
): string => {
  const messages: string[] = []

  if (data.details?.formErrors) {
    messages.push(
      ...data.details.formErrors,
    )
  }

  if (data.details?.fieldErrors) {
    Object.values(
      data.details.fieldErrors,
    ).forEach((fieldMessages) => {
      if (fieldMessages) {
        messages.push(
          ...fieldMessages,
        )
      }
    })
  }

  if (messages.length > 0) {
    return messages.join(' ')
  }

  if (
    data.error &&
    data.error !== 'Validation failed'
  ) {
    return data.error
  }

  return fallback
}

const clearViewCaches = (): void => {
  removeCacheByPrefix(
    VIEWS_CACHE_PREFIX,
  )

  removeCacheByPrefix(
    VIEW_CACHE_PREFIX,
  )

  removeCache('hashtags')
}

// Crea una nueva publicación
export const createView = async (
  payload: ViewFormPayload,
  token: string,
): Promise<PoliticalView> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/views`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify(payload),
      },
    )

    if (!response.ok) {
      const apiError =
        await readErrorResponse(
          response,
        )

      if (
        response.status === 400 ||
        response.status === 422
      ) {
        throw new ViewEditorError(
          response.status,
          getValidationMessage(
            apiError,
            'Revise los datos ingresados.',
          ),
          apiError.details,
        )
      }

      if (response.status === 403) {
        throw new ViewEditorError(
          403,
          'No tiene permiso para publicar.',
        )
      }

      if (response.status === 404) {
        throw new ViewEditorError(
          404,
          'El recurso solicitado no fue encontrado.',
        )
      }

      if (response.status === 409) {
        throw new ViewEditorError(
          409,
          apiError.error ??
            'Ya existe un registro con esos datos.',
        )
      }

      throw new ViewEditorError(
        response.status,
        apiError.error ??
          'No fue posible crear la publicación.',
      )
    }

    const data =
      (await response.json()) as ViewMutationResponse

    clearViewCaches()

    return data.view
  } catch (error) {
    if (
      error instanceof ViewEditorError
    ) {
      throw error
    }

    if (error instanceof Error) {
      throw new ViewEditorError(
        0,
        error.message,
      )
    }

    throw new ViewEditorError(
      0,
      'Ocurrió un error inesperado.',
    )
  }
}

// Obtiene una publicación para edición
export const getViewForEditing =
  async (
    viewId: string,
    token: string,
  ): Promise<PoliticalView> => {
    try {
      const response = await apiFetch(
        `${API_URL}/api/views/${viewId}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        const apiError =
          await readErrorResponse(
            response,
          )

        if (response.status === 403) {
          throw new ViewEditorError(
            403,
            'No tiene permiso para editar esta publicación.',
          )
        }

        if (response.status === 404) {
          throw new ViewEditorError(
            404,
            'La publicación no fue encontrada.',
          )
        }

        throw new ViewEditorError(
          response.status,
          apiError.error ??
            'No fue posible cargar la publicación.',
        )
      }

      const data =
        (await response.json()) as ViewMutationResponse

      return data.view
    } catch (error) {
      if (
        error instanceof ViewEditorError
      ) {
        throw error
      }

      if (error instanceof Error) {
        throw new ViewEditorError(
          0,
          error.message,
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
    const response = await apiFetch(
      `${API_URL}/api/views/${viewId}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify(payload),
      },
    )

    if (!response.ok) {
      const apiError =
        await readErrorResponse(
          response,
        )

      if (
        response.status === 400 ||
        response.status === 422
      ) {
        throw new ViewEditorError(
          response.status,
          getValidationMessage(
            apiError,
            'Revise los datos ingresados.',
          ),
          apiError.details,
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

      if (response.status === 409) {
        throw new ViewEditorError(
          409,
          apiError.error ??
            'Existe un conflicto con los datos enviados.',
        )
      }

      throw new ViewEditorError(
        response.status,
        apiError.error ??
          'No fue posible actualizar la publicación.',
      )
    }

    const data =
      (await response.json()) as ViewMutationResponse

    clearViewCaches()

    return data.view
  } catch (error) {
    if (
      error instanceof ViewEditorError
    ) {
      throw error
    }

    if (error instanceof Error) {
      throw new ViewEditorError(
        0,
        error.message,
      )
    }

    throw new ViewEditorError(
      0,
      'Ocurrió un error inesperado.',
    )
  }
}