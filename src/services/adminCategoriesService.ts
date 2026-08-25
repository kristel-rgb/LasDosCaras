import type {
  CategoriesResponse,
  Category,
} from '@/models/category'

import {
  removeCache,
} from '@/utils/cache'

const API_URL = import.meta.env.VITE_API_URL
const CATEGORIES_CACHE_KEY = 'categories'

interface CategoryResponse {
  category: Category
}

interface ApiErrorResponse {
  error?: string
}

const getErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const data: ApiErrorResponse =
      await response.json()

    return data.error || fallback
  } catch {
    return fallback
  }
}

export const getAdminCategories = async (
  token: string,
): Promise<CategoriesResponse> => {
  const response = await fetch(
    `${API_URL}/api/admin/categories`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'No fue posible cargar las categorías.',
      ),
    )
  }

  return await response.json()
}

export const createAdminCategory = async (
  name: string,
  token: string,
): Promise<Category> => {
  const response = await fetch(
    `${API_URL}/api/admin/categories`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
      }),
    },
  )

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        'Ya existe una categoría con ese nombre.',
      )
    }

    throw new Error(
      await getErrorMessage(
        response,
        'No fue posible crear la categoría.',
      ),
    )
  }

  const data: CategoryResponse =
    await response.json()

    removeCache(CATEGORIES_CACHE_KEY)

  return data.category
}

export const updateAdminCategory = async (
  categoryId: string,
  name: string,
  token: string,
): Promise<Category> => {
  const response = await fetch(
    `${API_URL}/api/admin/categories/${categoryId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
      }),
    },
  )

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(
        'Ya existe una categoría con ese nombre.',
      )
    }

    throw new Error(
      await getErrorMessage(
        response,
        'No fue posible actualizar la categoría.',
      ),
    )
  }

  const data: CategoryResponse =
    await response.json()

    removeCache(CATEGORIES_CACHE_KEY)

  return data.category
}

export const deleteAdminCategory = async (
  categoryId: string,
  token: string,
): Promise<void> => {
  const response = await fetch(
    `${API_URL}/api/admin/categories/${categoryId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'No fue posible eliminar la categoría.',
      ),
    )
  }
  removeCache(CATEGORIES_CACHE_KEY)
}