import type { SourceType } from '@/models/view'

// Fuente enviada al crear o editar una publicación
export interface ViewSourceInput {
  type: SourceType
  url: string
  label?: string
}

// Información de uno de los lados del formulario
export interface ViewSideInput {
  title: string
  description: string
  sources: ViewSourceInput[]
}

// Datos enviados al crear o editar una publicación
export interface ViewFormPayload {
  categoryId: string
  side: ViewSideInput
  counterpart: ViewSideInput
  hashtags?: string[]
}