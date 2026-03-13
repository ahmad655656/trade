// Client-safe Cloudinary URL generator (browser-only, no node deps)
export function getOptimizedImageUrlClient(
  imageUrl: string, 
  width = 400, 
  height?: number
): string {
  if (!imageUrl) return 'https://via.placeholder.com/400x300?text=No+Image'
  
  // Local paths pass through (already optimized)
  if (imageUrl.startsWith('/uploads/')) return imageUrl;
  
  try {
    // Support protocol-less URLs (//res.cloudinary.com/...) and missing protocol (res.cloudinary.com/...)
    const normalized = imageUrl.startsWith('//')
      ? `https:${imageUrl}`
      : imageUrl.startsWith('res.cloudinary.com/')
      ? `https://${imageUrl}`
      : imageUrl

    const url = new URL(normalized)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''

    // If Cloudinary isn't configured, just return the original URL.
    if (!cloudName) return normalized

    const transformations = [`w_${width}`, 'q_auto', 'f_auto']
    if (height) transformations.push(`h_${height}`, 'c_fill')

    // If this is already a Cloudinary URL, revamp it with optimized transformations.
    const uploadIndex = url.pathname.indexOf('/upload/')
    if (uploadIndex !== -1) {
      const afterUpload = url.pathname.slice(uploadIndex + '/upload/'.length)
      const parts = afterUpload.split('/')
      const withoutVersion = /^v\d+$/.test(parts[0]) ? parts.slice(1) : parts
      const publicIdWithExt = withoutVersion.join('/')
      const publicId = publicIdWithExt.replace(/\.[^.]+$/, '')
      return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${publicId}`
    }

    // If there is no /upload/ segment, we might already have a publicId (e.g. trade/products/..)
    const trimmedId = normalized.replace(/\.[^.]+$/, '')
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${trimmedId}`
  } catch {
    return imageUrl
  }
}
