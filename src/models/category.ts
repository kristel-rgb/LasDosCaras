// Categoría disponible en la plataforma
export interface Category {
  id: string
  name: string
  deletedAt: string | null
}

// Respuesta de GET /api/categories
export interface CategoriesResponse {
  categories: Category[]
}