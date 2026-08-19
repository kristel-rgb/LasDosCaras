// Autor de un comentario o hilo
export interface ThreadAuthor {
  id: string
  name: string
}

// Comentario dentro de un hilo
export interface ThreadComment {
  id: string
  content: string
  createdAt: string
  author: ThreadAuthor
}

// Hilo asociado a una publicación
export interface ViewThread {
  id: string
  title: string
  createdAt: string
  author: ThreadAuthor
  comments: ThreadComment[]
}