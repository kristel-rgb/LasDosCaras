// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Respuesta del endpoint de favoritos del usuario
interface FavoritesResponse {
  favorites: string[]
}

// Obtiene los favoritos del usuario autenticado
export const getMyFavorites = async (
  token: string,
): Promise<string[]> => {
  try {
    const response = await fetch(`${API_URL}/api/users/me/favorites`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    // Si la sesión expiró o el token no es válido
    if (response.status === 401) {
      throw new Error('La sesión ha expirado.')
    }

    if (!response.ok) {
      throw new Error('No fue posible cargar los favoritos.')
    }

    const data: FavoritesResponse = await response.json()

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

    throw new Error('Ocurrió un error inesperado.')
  }
}