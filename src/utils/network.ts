import {
  removeStorage,
} from '@/utils/cache'

export class OfflineError extends Error {
  constructor(
    message = 'No hay conexión a internet.',
  ) {
    super(message)
    this.name = 'OfflineError'
  }
}

const RETRY_DELAY_MS = 500

const SERVER_ERROR_STATUSES = [
  500,
  502,
  503,
]

const wait = (
  milliseconds: number,
): Promise<void> => {
  return new Promise((resolve) => {
    window.setTimeout(
      resolve,
      milliseconds,
    )
  })
}

export const isOffline = (): boolean => {
  return !navigator.onLine
}

const hasAuthorizationHeader = (
  headers?: HeadersInit,
): boolean => {
  if (!headers) {
    return false
  }

  return new Headers(headers).has(
    'Authorization',
  )
}

const handleHttpErrors = (
  response: Response,
  init: RequestInit,
): Response => {
  // Un 401 en una petición autenticada significa
  // que la sesión dejó de ser válida.
  if (
    response.status === 401 &&
    hasAuthorizationHeader(init.headers)
  ) {
    removeStorage(
      'lasdoscaras_auth',
    )

    removeStorage(
      'lasdoscaras_favorites',
    )

    if (
      window.location.pathname !== '/login'
    ) {
      window.location.assign(
        '/login?reason=session-expired',
        )
    }

    throw new Error(
      'La sesión ha expirado. Inicia sesión nuevamente.',
    )
  }

  if (
    SERVER_ERROR_STATUSES.includes(
        response.status,
    )
  ) {
    console.error(
        'Error del servidor:',
        response.status,
        response.statusText,
    )

    throw new Error(
        'Ocurrió un error en el servidor. Intente más tarde.',
    )
  }
  return response
}

export const apiFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> => {
  const method =
    (init.method ?? 'GET').toUpperCase()

  const isGetRequest = method === 'GET'

  // Las escrituras se bloquean inmediatamente
  // cuando el navegador está sin conexión.
  if (isOffline() && !isGetRequest) {
    throw new OfflineError(
      'No es posible realizar esta acción sin conexión al servidor.',
    )
  }

  try {
    const response =
        await fetch(input, init)

    return handleHttpErrors(
        response,
        init,
    )
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error
    }

    // Solo los GET reciben un reintento automático.
    if (
      isGetRequest &&
      !isOffline()
    ) {
      await wait(RETRY_DELAY_MS)

      try {
        const retryResponse =
            await fetch(input, init)

        return handleHttpErrors(
            retryResponse,
            init,
        )
      } catch (retryError) {
        if (
          retryError instanceof TypeError &&
          isOffline()
        ) {
          throw new OfflineError()
        }

        throw retryError
      }
    }

    if (isOffline()) {
      throw new OfflineError()
    }

    throw error
  }
}