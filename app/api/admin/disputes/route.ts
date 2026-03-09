import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { DisputeStatus } from '@prisma/client'

const DISPUTE_STATUSES = Object.values(DisputeStatus)

function isDisputeStatus(value: string): value is DisputeStatus {
  return DISPUTE_STATUSES.includes(value as DisputeStatus)
}

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')?.trim()

    const disputes = await prisma.dispute.findMany({
      where: {
        ...(status && isDisputeStatus(status) ? { status } : {}),
      },
      orderBy: { openedAt: 'desc' },
      include: {
        order: { select: { id: true, orderNumber: true, status: true } },
        trader: { include: { user: { select: { id: true, name: true, email: true } } } },
        supplier: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      take: 500,
    })

    return NextResponse.json({ success: true, data: disputes })
  } catch (error) {
    console.error('Failed to list admin disputes:', error)
    return NextResponse.json({ success: false, error: 'Failed to list disputes' }, { status: 500 })
  }
}
