import type { LoginData, LoginResponse } from '@/models/auth'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Envía las credenciales al API y devuelve el token JWT junto con el usuario
export const login = async (loginData: LoginData): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },

    // Convierte los datos de login a JSON antes de enviarlos
    body: JSON.stringify(loginData),
  })

  // Manejo de credenciales incorrectas
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Correo o contraseña incorrectos.')
    }

    // Error genérico para otros fallos del login
    throw new Error('No se pudo iniciar sesión.')
  }

  // Convierte la respuesta JSON del API a un objeto de TypeScript
  return await response.json()
}