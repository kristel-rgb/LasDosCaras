// Datos del usuario que devuelve el API
export interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  createdAt: string
}

// Datos que se envían al iniciar sesión
export interface LoginData {
  email: string
  password: string
}

// Respuesta exitosa del endpoint de login
export interface LoginResponse {
  token: string
  user: User
}