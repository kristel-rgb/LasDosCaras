export interface BoardFilters {
  categoryId: string
  sort: 'recent' | 'likes' | 'dislikes'
}

const FILTERS_KEY = 'lasdoscaras_filters'

export const saveBoardFilters = (
  filters: BoardFilters,
): void => {
  try {
    localStorage.setItem(
      FILTERS_KEY,
      JSON.stringify(filters),
    )
  } catch {
    // Un fallo de localStorage no debe
    // impedir utilizar el tablero.
  }
}

export const getBoardFilters =
  (): BoardFilters | null => {
    try {
      const stored =
        localStorage.getItem(FILTERS_KEY)

      if (!stored) {
        return null
      }

      const parsed =
        JSON.parse(stored) as BoardFilters

      if (
        typeof parsed.categoryId !== 'string' ||
        ![
          'recent',
          'likes',
          'dislikes',
        ].includes(parsed.sort)
      ) {
        localStorage.removeItem(FILTERS_KEY)
        return null
      }

      return parsed
    } catch {
      localStorage.removeItem(FILTERS_KEY)
      return null
    }
  }