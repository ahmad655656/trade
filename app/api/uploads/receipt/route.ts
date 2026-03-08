import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

export async function POST(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: i18nText(language, 'ملف الصورة مطلوب', 'Receipt image file is required') }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: i18nText(language, 'يجب رفع صورة فقط', 'Only image files are allowed') }, { status: 400 })
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      return NextResponse.json({ success: false, error: i18nText(language, 'حجم الصورة يجب أن يكون 5MB أو أقل', 'Image must be 5MB or less') }, { status: 400 })
    }

    const originalExtension = path.extname(file.name || '').toLowerCase()
    const extension = ALLOWED_EXTENSIONS.has(originalExtension) ? originalExtension : '.png'
    const fileName = `receipt-${Date.now()}-${randomUUID()}${extension}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, fileName), buffer)

    return NextResponse.json({
      success: true,
      data: { url: `/uploads/receipts/${fileName}` },
      message: i18nText(language, 'تم رفع صورة الوصل بنجاح', 'Receipt image uploaded successfully'),
    })
  } catch (error) {
    console.error('Failed to upload receipt image:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload receipt image' }, { status: 500 })
  }
}

