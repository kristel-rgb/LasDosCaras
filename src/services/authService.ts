import type { LoginData, LoginResponse } from '@/models/auth'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Envía las credenciales al API y devuelve el token JWT junto con el usuario
export const login = async (loginData: LoginData): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },

      // Convierte los datos del formulario a JSON
      body: JSON.stringify(loginData),
    })

    // Credenciales incorrectas
    if (response.status === 401) {
      throw new Error('Correo o contraseña incorrectos.')
    }

    // Usuario sin permiso para iniciar sesión, por ejemplo si está baneado
    if (response.status === 403) {
      throw new Error('Tu cuenta no tiene permiso para iniciar sesión.')
    }

    // Otros errores devueltos por el servidor
    if (!response.ok) {
      throw new Error('No se pudo iniciar sesión.')
    }

    // Devuelve el token JWT y los datos del usuario
    return await response.json()
  } catch (error) {
    // Cuando fetch no logra conectarse al API
    if (error instanceof TypeError) {
      throw new Error(
        'No fue posible conectar con el servidor. Verifique su conexión e intente de nuevo.',
      )
    }

    // Conserva los mensajes específicos generados anteriormente
    if (error instanceof Error) {
      throw error
    }

    throw new Error('Ocurrió un error inesperado.')
  }
}