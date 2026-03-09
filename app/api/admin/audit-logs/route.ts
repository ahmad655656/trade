import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')?.trim()
    const entityType = searchParams.get('entityType')?.trim()
    const actorUserId = searchParams.get('actorUserId')?.trim()
    const take = Math.min(Math.max(Number(searchParams.get('take') ?? '100'), 1), 500)

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
        ...(actorUserId ? { actorUserId } : {}),
      },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Failed to list audit logs:', error)
    return NextResponse.json({ success: false, error: 'Failed to list audit logs' }, { status: 500 })
  }
}

