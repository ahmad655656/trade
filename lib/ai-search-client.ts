import type { Pipeline } from '@xenova/transformers'

type TransformersModule = typeof import('@xenova/transformers')

let transformersModule: TransformersModule | null = null
let embedder: Pipeline | null = null
let embedderPromise: Promise<Pipeline> | null = null

async function getTransformers() {
  if (typeof window === 'undefined') {
    throw new Error('AI search is only available in the browser.')
  }
  if (!transformersModule) {
    transformersModule = await import('@xenova/transformers')
    transformersModule.env.allowRemoteModels = true
    transformersModule.env.allowLocalModels = false
  }
  return transformersModule
}

async function getEmbedder() {
  if (embedder) return embedder
  if (embedderPromise) return embedderPromise

  embedderPromise = (async () => {
    const { pipeline } = await getTransformers()
    const instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    embedder = instance
    return instance
  })()

  return embedderPromise
}

export interface SearchableItem {
  id: string
  type: 'product' | 'supplier' | 'category'
  title: string
  description: string
  url: string
  score: number
  price?: number
  rating?: number
  image?: string
}

export async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder()
  const output = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  })
  return Array.from(output.data as Float32Array)
}

function basicSearch(
  query: string,
  items: Array<{
    id: string
    type: 'product' | 'supplier'
    title: string
    description: string
    url: string
  }>,
  topK: number,
): SearchableItem[] {
  const normalizedQuery = query.toLowerCase().trim()
  const terms = normalizedQuery.split(/\s+/).filter(Boolean)

  const scored = items.map((item) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase()
    let score = 0
    if (haystack.includes(normalizedQuery)) score += 2
    for (const term of terms) {
      if (term && haystack.includes(term)) score += 1
    }
    return { ...item, score }
  })

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => ({ ...item, score: Math.round(item.score * 100) / 100 }))
}

export async function searchSemantic(
  query: string,
  items: Array<{
  id: string
  type: 'product' | 'supplier'
  title: string
  description: string
  url: string
  price?: number
  image?: string
  supplier?: any
  category?: any
  rating?: number
  productCount?: number
  }>,
  topK = 10,
): Promise<SearchableItem[]> {
  try {
    const queryEmbedding = await embedText(query)
    
    const scored = await Promise.all(
      items.map(async (item) => {
        const itemText = `${item.title} ${item.description}`.toLowerCase()
        const itemEmbedding = await embedText(itemText)
        let score = 0
        for (let i = 0; i < queryEmbedding.length; i++) {
          score += queryEmbedding[i] * itemEmbedding[i]
        }
        return { ...item, score }
      }),
    )

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => ({ ...item, score: Math.round(item.score * 100) / 100 }))
  } catch {
    return basicSearch(query, items, topK)
  }
}
