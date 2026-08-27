const CACHE_PREFIX = 'lasdoscaras_'

interface CacheEntry<T> {
  value: T
  timestamp: number
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

  const timestamp = Date.now()

  const entry: CacheEntry<T> = {
    value,
    timestamp,
    expiresAt: timestamp + ttlMs,
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
      typeof entry.timestamp !== 'number' ||
      typeof entry.expiresAt !== 'number'
    ) {
      localStorage.removeItem(storageKey)
      return null
    }

    // TTL vencido
    if (Date.now() >= entry.expiresAt) {
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

// Obtiene un valor aunque su TTL haya vencido.
// Se utiliza solamente como respaldo cuando
// no es posible consultar el API.
export const getStaleCache = <T>(
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
      typeof entry.timestamp !== 'number' ||
      typeof entry.expiresAt !== 'number'
    ) {
      localStorage.removeItem(storageKey)
      return null
    }

    return entry.value
  } catch {
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

// Guarda datos persistentes sin TTL.
// Se utiliza para auth, filtros, favoritos,
// borrador, tema e historial.
export const setStorage = <T>(
  key: string,
  value: T,
): void => {
  try {
    const serialized =
      typeof value === 'string'
        ? value
        : JSON.stringify(value)

    localStorage.setItem(
      key,
      serialized,
    )
  } catch {
    // Un fallo de localStorage no debe
    // romper la aplicación.
  }
}

// Recupera datos persistentes sin TTL.
export const getStorage = <T>(
  key: string,
): T | null => {
  try {
    const stored =
      localStorage.getItem(key)

    if (stored === null) {
      return null
    }

    try {
      return JSON.parse(stored) as T
    } catch {
      // Permite valores simples como
      // "light" y "dark".
      return stored as T
    }
  } catch {
    return null
  }
}

// Elimina datos persistentes sin TTL.
export const removeStorage = (
  key: string,
): void => {
  try {
    localStorage.removeItem(key)
  } catch {
    // La app continúa aunque storage falle.
  }
}