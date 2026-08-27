import type { ViewFormPayload } from '@/models/viewForm'
import {
  getStorage,
  removeStorage,
  setStorage,
} from '@/utils/cache'

const DRAFT_KEY = 'lasdoscaras_draft'

export interface ViewDraft {
  form: ViewFormPayload
  savedAt: string
}

// Guarda el formulario actual como borrador
export const saveViewDraft = (
  form: ViewFormPayload,
): void => {
  try {
    const draft: ViewDraft = {
      form,
      savedAt: new Date().toISOString(),
    }

    setStorage(
      DRAFT_KEY,
      draft,
    )
  } catch {
    // Un error de localStorage no debe impedir
    // que el usuario continúe creando la publicación.
  }
}

// Recupera el borrador guardado
export const getViewDraft =
  (): ViewDraft | null => {
    return getStorage<ViewDraft>(
      DRAFT_KEY,
    )
  }

// Elimina el borrador
export const clearViewDraft =
  (): void => {
    removeStorage(DRAFT_KEY)
  }