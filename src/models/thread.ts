// Usuario que escribe un comentario
export interface ThreadUser {
  id: string
  name: string
}

// Respuesta dentro de un comentario
export interface ThreadReply {
  id: string
  threadId: string
  userId: string
  parentId: string | null
  content: string
  createdAt: string
  user: ThreadUser
  replies: ThreadReply[]
}

// Comentario perteneciente a un hilo
export interface ThreadComment {
  id: string
  threadId: string
  userId: string
  parentId: string | null
  content: string
  createdAt: string
  user: ThreadUser
  replies: ThreadReply[]
}

// Hilo asociado a una publicación
export interface ViewThread {
  id: string
  politicalViewId: string
  title: string
  createdAt: string
  comments: ThreadComment[]
}