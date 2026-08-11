import type {
  CategoriesResponse,
} from '@/models/category'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Obtiene todas las categorías disponibles
export const getCategories = async (): Promise<CategoriesResponse> => {
  try {
    const response = await fetch(
      `${API_URL}/api/categories`,
    )

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar las categorías.',
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