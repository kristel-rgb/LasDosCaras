// Datos que el usuario envía al registrarse
export interface RegisterData {
  name: string
  email: string
  password: string
}

// Usuario que devuelve el API después del registro
export interface RegisteredUser {
  id: string
  email: string
  name: string
  role: string
  status: string
  createdAt: string
}

// Respuesta del endpoint POST /api/auth/register
export interface RegisterResponse {
  user: RegisteredUser
  activationToken: string
}

// Respuesta del endpoint de activación
export interface ActivateResponse {
  user: RegisteredUser
}