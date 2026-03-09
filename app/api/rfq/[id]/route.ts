import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status: z.enum(['OPEN', 'QUOTED', 'CLOSED', 'CANCELLED']),
})

export async function GET(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: {
        trader: { include: { user: { select: { id: true, name: true } } } },
        quotes: {
          include: {
            supplier: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!rfq) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'RFQ not found') }, { status: 404 })
    }

    if (user.role !== Role.ADMIN && user.id !== rfq.trader.user.id) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: rfq })
  } catch (error) {
    console.error('Failed to get RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to get RFQ' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: { trader: { include: { user: { select: { id: true } } } } },
    })

    if (!rfq) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'RFQ not found') }, { status: 404 })
    }

    if (user.role !== Role.ADMIN && user.id !== rfq.trader.user.id) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
    }

    const updated = await prisma.rfq.update({
      where: { id },
      data: { status: parsed.data.status },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'RFQ_STATUS_UPDATED',
      entityType: 'RFQ',
      entityId: rfq.id,
      metadata: { status: parsed.data.status },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Failed to update RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to update RFQ' }, { status: 500 })
  }
}

