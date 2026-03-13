'use client'

import { getOptimizedImageUrlClient } from '@/lib/client-cloudinary'

type CloudImageProps = {
  src?: string | null
  alt?: string
  width?: number
  height?: number
  className?: string
}

function resolveImageSrc(src: string, width: number, height?: number) {
  const trimmed = src.trim()
  if (!trimmed) return ''

  const isLocal = trimmed.startsWith('blob:') || trimmed.startsWith('data:')
  if (isLocal) return trimmed

  const isHttp = /^https?:\/\//i.test(trimmed)
  if (!isHttp) return trimmed

  try {
    return getOptimizedImageUrlClient(trimmed, width, height)
  } catch {
    return trimmed
  }
}

export function CloudImage({ src, alt = '', width = 400, height = 300, className = '' }: CloudImageProps) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-gray-100 ${className}`}
        style={{ width, height }}
        aria-label={alt || 'No image'}
      >
        <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  const resolvedSrc = resolveImageSrc(src, width, height)

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
    />
  )
}
