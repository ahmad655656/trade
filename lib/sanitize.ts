const TAG_PATTERN = /<[^>]*>/g

export function sanitizePlainText(value: unknown, maxLength = 4000) {
  const raw = String(value ?? '')
  const noTags = raw.replace(TAG_PATTERN, '')
  return noTags.trim().slice(0, maxLength)
}

export function sanitizeStringArray(values: unknown, maxLength = 20, maxItemLength = 512) {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => sanitizePlainText(value, maxItemLength))
    .filter(Boolean)
    .slice(0, maxLength)
}

export function normalizeSearchTerm(value: unknown) {
  return sanitizePlainText(value, 120).toLowerCase()
}

