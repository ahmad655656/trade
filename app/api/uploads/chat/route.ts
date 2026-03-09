import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

const MAX_CHAT_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'])

export async function POST(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الملف مطلوب', 'File is required') }, { status: 400 })
    }

    if (file.size > MAX_CHAT_FILE_SIZE) {
      return NextResponse.json({ success: false, error: i18nText(language, 'حجم الملف يجب أن يكون 10MB أو أقل', 'File must be 10MB or less') }, { status: 400 })
    }

    const ext = path.extname(file.name || '').toLowerCase()
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin'
    const fileName = `chat-${Date.now()}-${randomUUID()}${safeExt}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat')
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, fileName), buffer)

    return NextResponse.json({
      success: true,
      data: { url: `/uploads/chat/${fileName}` },
      message: i18nText(language, 'تم رفع الملف بنجاح', 'File uploaded successfully'),
    })
  } catch (error) {
    console.error('Failed to upload chat file:', error)
    return NextResponse.json({ success: false, error: 'Failed to upload chat file' }, { status: 500 })
  }
}

