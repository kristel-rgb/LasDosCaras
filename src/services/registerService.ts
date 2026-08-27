import type {
  ActivateResponse,
  RegisterData,
  RegisterResponse,
} from '@/models/register'

import {
  apiFetch,
} from '@/utils/network'

const API_URL =
  import.meta.env.VITE_API_URL

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

export class RegisterError
  extends Error {
  status: number
  fieldErrors?: Record<
    string,
    string[] | undefined
  >

  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<
      string,
      string[] | undefined
    >,
  ) {
    super(message)

    this.name = 'RegisterError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const readApiError = async (
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

  return 'Revise los datos ingresados.'
}

// Registra un nuevo usuario
export const registerUser = async (
  registerData: RegisterData,
): Promise<RegisterResponse> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/auth/register`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(registerData),
      },
    )

    if (!response.ok) {
      const apiError =
        await readApiError(response)

      if (response.status === 409) {
        throw new RegisterError(
          409,
          'El correo ya está registrado.',
          {
            email: [
              'El correo ya está registrado.',
            ],
          },
        )
      }

      if (
        response.status === 400 ||
        response.status === 422
      ) {
        throw new RegisterError(
          response.status,
          getValidationMessage(
            apiError,
          ),
          apiError.details?.fieldErrors,
        )
      }

      if (response.status === 403) {
        throw new RegisterError(
          403,
          'No tiene permiso para crear esta cuenta.',
        )
      }

      throw new RegisterError(
        response.status,
        apiError.error ??
          'No se pudo crear la cuenta.',
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof RegisterError) {
      throw error
    }

    if (error instanceof Error) {
      throw new RegisterError(
        0,
        error.message,
      )
    }

    throw new RegisterError(
      0,
      'Ocurrió un error inesperado.',
    )
  }
}

// Activa una cuenta
export const activateAccount = async (
  activationToken: string,
): Promise<ActivateResponse> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/auth/activate/${encodeURIComponent(
        activationToken,
      )}`,
      {
        method: 'GET',
      },
    )

    if (!response.ok) {
      const apiError =
        await readApiError(response)

      if (response.status === 400) {
        throw new RegisterError(
          400,
          apiError.error ??
            'El token de activación no es válido.',
        )
      }

      if (response.status === 404) {
        throw new RegisterError(
          404,
          'La cuenta o el token de activación no fueron encontrados.',
        )
      }

      throw new RegisterError(
        response.status,
        apiError.error ??
          'No fue posible activar la cuenta.',
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof RegisterError) {
      throw error
    }

    if (error instanceof Error) {
      throw new RegisterError(
        0,
        error.message,
      )
    }

    throw new RegisterError(
      0,
      'Ocurrió un error inesperado.',
    )
  }
}