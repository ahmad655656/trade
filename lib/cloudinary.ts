import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Local upload fallback
async function localUploadBuffer(buffer: Buffer, public_id?: string, folder = 'trade/products'): Promise<string> {
  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  const filename = `${folder.replace(/\//g, '-')}/${timestamp}-${randomId}.jpg`;
  const fullDir = path.join(process.cwd(), 'public/uploads/products');
  const filepath = path.join(fullDir, filename);
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  
  // Simple JPEG save (strip metadata, resize optional)
  await fs.writeFile(filepath, buffer);
  
  console.log(`Local image saved: ${filepath}`);
  return `/uploads/products/${filename}`;
}

// Cloudinary upload (existing)
async function cloudinaryUpload(buffer: Buffer, public_id?: string, folder = 'trade/products'): Promise<string> {
  return new Promise((resolve, reject) => {
    const cb = (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
      if (error) reject(error);
      else if (result?.secure_url) resolve(result.secure_url);
      else reject(new Error('Upload failed'));
    };

    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id,
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' },
          { width: 1200, height: 1200, crop: 'limit' },
        ],
      },
      cb
    ).end(buffer);
  });
}

// Main upload with smart fallback
export async function uploadImageBuffer(buffer: Buffer, public_id?: string, folder = 'trade/products'): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('Cloudinary environment variables missing. Using local file storage for uploads.');
    return localUploadBuffer(buffer, public_id, folder);
  }
  
  // Configure only if vars present
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  
  try {
    return await cloudinaryUpload(buffer, public_id, folder);
  } catch (error: unknown) {
    console.warn(`Cloudinary upload failed (${(error as Error).message}), falling back to local storage. Enable Cloudinary account or check env vars.`);
    return localUploadBuffer(buffer, public_id, folder);
  }
}

// Optimized URL helper (enhanced for local fallback)
export function getOptimizedImageUrl(imageUrl: string, width = 400, height?: number): string {
  if (!imageUrl) return 'https://via.placeholder.com/400x300?text=No+Image';
  
  // Local paths pass through
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

    const transformations = [
      { width, height, crop: height ? 'fill' : 'scale' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ]

    const uploadIndex = url.pathname.indexOf('/upload/')
    if (uploadIndex !== -1) {
      const afterUpload = url.pathname.slice(uploadIndex + '/upload/'.length)
      const parts = afterUpload.split('/')
      const withoutVersion = /^v\d+$/.test(parts[0]) ? parts.slice(1) : parts
      const publicIdWithExt = withoutVersion.join('/')
      const publicId = publicIdWithExt.replace(/\.[^.]+$/, '')

      return cloudinary.url(publicId, {
        transformation: transformations,
      })
    }

    // If there is no /upload/ segment, assume this is already a publicId.
    const trimmedId = normalized.replace(/\.[^.]+$/, '')
    return cloudinary.url(trimmedId, {
      transformation: transformations,
    })
  } catch {
    return imageUrl
  }
}

// Delete image (Cloudinary only, local delete separate if needed)
export async function deleteImage(publicId: string): Promise<void> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('Cannot delete: Cloudinary not configured');
    return;
  }
  
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: unknown) {
    console.warn(`Delete failed: ${(error as Error).message}`);
  }
}

