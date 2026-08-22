import type {
  AdminUser,
  AdminUserResponse,
  AdminUsersResponse,
} from '@/models/adminUser'

const API_URL = import.meta.env.VITE_API_URL

interface GetAdminUsersParams {
  search?: string
  page?: number
  limit?: number
}

// Obtiene la lista de usuarios para administración
export const getAdminUsers = async (
  token: string,
  params: GetAdminUsersParams = {},
): Promise<AdminUsersResponse> => {
  const query = new URLSearchParams()

  if (params.search?.trim()) {
    query.set('search', params.search.trim())
  }

  query.set('page', String(params.page ?? 1))
  query.set('limit', String(params.limit ?? 20))

  const response = await fetch(
    `${API_URL}/api/admin/users?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      'No fue posible cargar los usuarios.',
    )
  }

  return await response.json()
}

// Suspende un usuario
export const banAdminUser = async (
  userId: string,
  token: string,
): Promise<AdminUser> => {
  const response = await fetch(
    `${API_URL}/api/admin/users/${userId}/ban`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      'No fue posible suspender el usuario.',
    )
  }

  const data: AdminUserResponse =
    await response.json()

  return data.user
}

// Reactiva un usuario suspendido
export const unbanAdminUser = async (
  userId: string,
  token: string,
): Promise<AdminUser> => {
  const response = await fetch(
    `${API_URL}/api/admin/users/${userId}/unban`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      'No fue posible reactivar el usuario.',
    )
  }

  const data: AdminUserResponse =
    await response.json()

  return data.user
}