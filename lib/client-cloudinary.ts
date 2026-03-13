// Client-safe Cloudinary URL generator (browser-only, no node deps)
export function getOptimizedImageUrlClient(
  imageUrl: string, 
  width = 400, 
  height?: number
): string {
  if (!imageUrl) return 'https://via.placeholder.com/400x300?text=No+Image'
  
  // Local paths pass through (already optimized)
  if (imageUrl.startsWith('/uploads/')) return imageUrl;
  
  const url = new URL(imageUrl)
  const pathname = url.pathname
  const publicId = pathname.split('/').pop()?.split('.')[0] || ''
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_${width},q_auto,f_auto${height ? `,h_${height},c_fill` : ''}/${publicId}`
}
