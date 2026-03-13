import { NextRequest, NextResponse } from 'next/server'
import { uploadImageBuffer } from '@/lib/cloudinary'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'

export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    // Auth check: only suppliers
    const user = await getSessionUser()
    if (!user || user.role !== 'SUPPLIER' || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Parse native FormData (Next.js 15+ compatible)
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Image too large (max 10MB)' }, { status: 400 })
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to Cloudinary
    const publicId = `products/${user.supplier.id}/${Date.now()}-${Math.random().toString(36).slice(2)}`
    const url = await uploadImageBuffer(buffer, publicId, 'trade/products')

    return NextResponse.json({
      success: true,
      data: { url }
    })

  } catch (error: unknown) {
    console.error('Product image upload failed:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}

