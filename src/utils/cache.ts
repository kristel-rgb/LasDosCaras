const CACHE_PREFIX = 'lasdoscaras_cache:'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// Guarda un valor en localStorage con tiempo de expiración
export const setCache = <T>(
  key: string,
  value: T,
  ttlMs: number,
): void => {
  if (ttlMs <= 0) {
    return
  }

  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
  }

  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify(entry),
    )
  } catch {
    // Si localStorage no está disponible o está lleno,
    // la aplicación debe seguir funcionando normalmente.
  }
}

// Obtiene un valor solamente si todavía no ha expirado
export const getCache = <T>(
  key: string,
): T | null => {
  const storageKey =
    `${CACHE_PREFIX}${key}`

  try {
    const stored =
      localStorage.getItem(storageKey)

    if (!stored) {
      return null
    }

    const entry =
      JSON.parse(stored) as CacheEntry<T>

    if (
      !entry ||
      typeof entry.expiresAt !== 'number'
    ) {
      localStorage.removeItem(storageKey)
      return null
    }

    // TTL vencido
    if (Date.now() >= entry.expiresAt) {
      localStorage.removeItem(storageKey)
      return null
    }

    return entry.value
  } catch {
    // Caché corrupto: se elimina y se fuerza
    // una nueva consulta al API.
    localStorage.removeItem(storageKey)

    return null
  }
}

// Elimina una entrada específica
export const removeCache = (
  key: string,
): void => {
  localStorage.removeItem(
    `${CACHE_PREFIX}${key}`,
  )
}

// Elimina todas las entradas que comiencen
// con una clave determinada.
export const removeCacheByPrefix = (
  keyPrefix: string,
): void => {
  const fullPrefix =
    `${CACHE_PREFIX}${keyPrefix}`

  const keysToRemove: string[] = []

  for (
    let index = 0;
    index < localStorage.length;
    index += 1
  ) {
    const key = localStorage.key(index)

    if (
      key &&
      key.startsWith(fullPrefix)
    ) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key)
  })
}