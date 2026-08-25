import type { ViewFormPayload } from '@/models/viewForm'

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

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(draft),
    )
  } catch {
    // Un error de localStorage no debe impedir
    // que el usuario continúe creando la publicación.
  }
}

// Recupera el borrador guardado
export const getViewDraft = (): ViewDraft | null => {
  try {
    const storedDraft =
      localStorage.getItem(DRAFT_KEY)

    if (!storedDraft) {
      return null
    }

    return JSON.parse(storedDraft) as ViewDraft
  } catch {
    return null
  }
}

// Elimina el borrador
export const clearViewDraft = (): void => {
  localStorage.removeItem(DRAFT_KEY)
}