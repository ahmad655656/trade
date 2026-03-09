import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf'])

export async function POST(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || (user.role !== Role.SUPPLIER && user.role !== Role.ADMIN)) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الملف مطلوب', 'Document file is required') }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: i18nText(language, 'حجم الملف يجب أن يكون 8MB أو أقل', 'File must be 8MB or less') }, { status: 400 })
    }

    const originalExtension = path.extname(file.name || '').toLowerCase()
    const extension = ALLOWED_EXTENSIONS.has(originalExtension) ? originalExtension : '.png'
    const fileName = `verification-${Date.now()}-${randomUUID()}${extension}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'verification')
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, fileName), buffer)

    return NextResponse.json({
      success: true,
      data: { url: `/uploads/verification/${fileName}` },
      message: i18nText(language, 'تم رفع الملف بنجاح', 'Document uploaded successfully'),
    })
  } catch (error) {
    console.error('Failed to upload verification file:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload verification file' }, { status: 500 })
  }
}

