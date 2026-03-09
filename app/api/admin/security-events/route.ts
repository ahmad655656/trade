import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { SecurityEventType } from '@prisma/client'

const SECURITY_EVENT_TYPES = Object.values(SecurityEventType)

function isSecurityEventType(value: string): value is SecurityEventType {
  return SECURITY_EVENT_TYPES.includes(value as SecurityEventType)
}

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')?.trim()
    const severity = Number(searchParams.get('severity') ?? '')
    const take = Math.min(Math.max(Number(searchParams.get('take') ?? '100'), 1), 500)

    const events = await prisma.securityEvent.findMany({
      where: {
        ...(type && isSecurityEventType(type) ? { type } : {}),
        ...(Number.isFinite(severity) ? { severity } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    return NextResponse.json({ success: true, data: events })
  } catch (error) {
    console.error('Failed to list security events:', error)
    return NextResponse.json({ success: false, error: 'Failed to list security events' }, { status: 500 })
  }
}
