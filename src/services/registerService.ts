import type {
  ActivateResponse,
  RegisterData,
  RegisterResponse,
} from '@/models/register'

import {
  apiFetch,
} from '@/utils/network'

// URL base del API obtenida desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL

// Registra un nuevo usuario en la plataforma
export const registerUser = async (
  registerData: RegisterData,
): Promise<RegisterResponse> => {
  try {
    const response = await apiFetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    })

    // Correo ya registrado
    if (response.status === 409) {
      throw new Error('El correo ya está registrado.')
    }

    // Datos inválidos
    if (response.status === 400) {
      throw new Error('Revise los datos ingresados.')
    }

    // Otros errores del servidor
    if (!response.ok) {
      throw new Error('No se pudo crear la cuenta.')
    }

    return await response.json()
  } catch (error) {
    // Conserva los mensajes de error que generamos arriba
    if (error instanceof Error) {
      throw error
    }

    throw new Error(
      'No fue posible conectar con el servidor. Verifique su conexión.',
    )
  }
}

// Activa una cuenta utilizando el token generado durante el registro
export const activateAccount = async (
  activationToken: string,
): Promise<ActivateResponse> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/auth/activate/${encodeURIComponent(activationToken)}`,
      {
        method: 'GET',
      },
    )

    if (!response.ok) {
      throw new Error('No fue posible activar la cuenta.')
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error(
      'No fue posible conectar con el servidor. Verifique su conexión.',
    )
  }
}