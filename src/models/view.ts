// Tipos de fuente permitidos por el API
export type SourceType = 'LINK' | 'YOUTUBE' | 'DOCUMENT'

// Tipos de los dos lados de una publicación
export type ViewSideType = 'SIDE' | 'COUNTERPART'

// Tipos de reacción del usuario
export type ReactionType = 'LIKE' | 'DISLIKE'

// Fuente asociada a uno de los lados
export interface ViewSource {
  id: string
  type: SourceType
  url: string
  label: string | null
}

// Categoría de la publicación
export interface ViewCategory {
  id: string
  name: string
}

// Autor de la publicación
export interface ViewAuthor {
  id: string
  name: string
}

// Hashtag asociado a la publicación
export interface ViewHashtag {
  id: string
  name: string
}

// Representa uno de los dos lados de una publicación
export interface ViewSide {
  id: string
  type: ViewSideType
  title: string
  description: string
  sources: ViewSource[]
  likeCount: number
  dislikeCount: number
  myReaction: ReactionType | null
}

// Publicación completa devuelta por el API
export interface PoliticalView {
  id: string
  categoryId: string
  authorId: string
  status: 'PUBLISHED' | 'UNPUBLISHED'
  createdAt: string
  updatedAt: string

  category: ViewCategory
  author: ViewAuthor
  sides: ViewSide[]
  hashtags: ViewHashtag[]

  _count: {
    threads: number
  }

  totalLikes: number
  totalDislikes: number
  isFavorite: boolean
}

// Respuesta de GET /api/views
export interface ViewsResponse {
  total: number
  page: number
  limit: number
  views: PoliticalView[]
}