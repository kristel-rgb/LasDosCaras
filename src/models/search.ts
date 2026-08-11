import type { Category } from '@/models/category'

// Lado resumido devuelto por la búsqueda global
export interface SearchViewSide {
  type: 'SIDE' | 'COUNTERPART'
  title: string
}

// Autor resumido
export interface SearchAuthor {
  id: string
  name: string
}

// Hashtag encontrado
export interface SearchHashtag {
  id: string
  name: string
}

// Publicación resumida encontrada
export interface SearchView {
  id: string
  categoryId: string
  authorId: string
  status: 'PUBLISHED' | 'UNPUBLISHED'
  createdAt: string
  updatedAt: string

  category: Category
  author: SearchAuthor
  sides: SearchViewSide[]
}

// Respuesta de GET /api/search
export interface SearchResponse {
  views: SearchView[]
  categories: Category[]
  hashtags: SearchHashtag[]
  authors: SearchAuthor[]
}