export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  createdAt: string
}

export interface AdminUsersResponse {
  total: number
  page: number
  limit: number
  users: AdminUser[]
}

export interface AdminUserResponse {
  user: AdminUser
}