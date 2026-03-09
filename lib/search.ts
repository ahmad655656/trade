export function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, col) => {
      if (row === 0) return col
      if (col === 0) return row
      return 0
    }),
  )

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      )
    }
  }

  return matrix[a.length][b.length]
}

export function similarity(a: string, b: string) {
  const maxLength = Math.max(a.length, b.length)
  if (!maxLength) return 1
  return 1 - levenshtein(a, b) / maxLength
}

