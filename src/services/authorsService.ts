import type {
  AuthorResponse,
  PublicAuthor,
} from '@/models/author'

const API_URL = import.meta.env.VITE_API_URL

// Obtiene la información pública de un autor
export const getAuthorById = async (
  authorId: string,
): Promise<PublicAuthor> => {
  try {
    const response = await fetch(
      `${API_URL}/api/authors/${authorId}`,
    )

    if (response.status === 404) {
      throw new Error(
        'El autor no fue encontrado.',
      )
    }

    if (!response.ok) {
      throw new Error(
        'No fue posible cargar el perfil del autor.',
      )
    }

    const data: AuthorResponse =
      await response.json()

    return data.author
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