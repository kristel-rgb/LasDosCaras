import type {
  SearchResponse,
} from '@/models/search'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Ejecuta la búsqueda global de la plataforma
export const searchGlobal = async (
  query: string,
): Promise<SearchResponse> => {
  const term = query.trim()

  if (!term) {
    return {
      views: [],
      categories: [],
      hashtags: [],
      authors: [],
    }
  }

  try {
    const response = await fetch(
      `${API_URL}/api/search?q=${encodeURIComponent(term)}`,
    )

    if (!response.ok) {
      throw new Error(
        'No fue posible realizar la búsqueda.',
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