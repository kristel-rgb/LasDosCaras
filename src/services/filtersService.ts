import {
  getStorage,
  removeStorage,
  setStorage,
} from '@/utils/cache'

export interface BoardFilters {
  categoryId: string
  sort:
    | 'recent'
    | 'likes'
    | 'dislikes'
  hashtags: string[]
}

const FILTERS_KEY =
  'lasdoscaras_filters'

export const saveBoardFilters = (
  filters: BoardFilters,
): void => {
  setStorage(
    FILTERS_KEY,
    filters,
  )
}

export const getBoardFilters =
  (): BoardFilters | null => {
    const stored =
      getStorage<BoardFilters>(
        FILTERS_KEY,
      )

    if (!stored) {
      return null
    }

    if (
      typeof stored.categoryId !== 'string' ||
      ![
        'recent',
        'likes',
        'dislikes',
      ].includes(stored.sort) ||
      !Array.isArray(stored.hashtags) ||
      !stored.hashtags.every(
        (hashtag) =>
          typeof hashtag === 'string',
      )
    ) {
      removeStorage(FILTERS_KEY)
      return null
    }

    return stored
  }