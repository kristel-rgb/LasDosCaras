export interface PublicAuthor {
  id: string
  name: string
  createdAt: string
  publishedViewsCount: number
}

export interface AuthorResponse {
  author: PublicAuthor
}