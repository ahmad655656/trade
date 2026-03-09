import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { rfqCreateSchema } from '@/lib/validation'
import { sanitizePlainText } from '@/lib/sanitize'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const where =
      user.role === Role.ADMIN
        ? {}
        : user.role === Role.TRADER && user.trader
          ? { traderId: user.trader.id }
          : user.role === Role.SUPPLIER && user.supplier
            ? { quotes: { some: { supplierId: user.supplier.id } } }
            : { id: '__none__' }

    const rfqs = await prisma.rfq.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json({ success: true, data: rfqs })
  } catch (error) {
    console.error('Failed to list RFQs:', error)
    return NextResponse.json({ success: false, error: 'Failed to list RFQs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const body = await request.json()
    const parsed = rfqCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid RFQ payload' }, { status: 400 })
    }

    const created = await prisma.rfq.create({
      data: {
        traderId: user.trader.id,
        productRequest: sanitizePlainText(parsed.data.productRequest, 400),
        quantity: parsed.data.quantity,
        deliveryLocation: sanitizePlainText(parsed.data.deliveryLocation, 200),
        notes: sanitizePlainText(parsed.data.notes, 2000) || null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
      include: {
        trader: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    const supplierUsers = await prisma.user.findMany({
      where: { role: 'SUPPLIER' },
      select: { id: true },
      take: 1000,
    })

    await notifyUsers({
      userIds: supplierUsers.map((item) => item.id),
      type: NotificationType.RFQ_RECEIVED,
      title: i18nText(language, 'طلب عرض سعر جديد', 'New RFQ available'),
      message: i18nText(language, 'تم نشر طلب عرض سعر جديد من أحد التجار.', 'A new RFQ has been posted by a merchant.'),
      data: { rfqId: created.id },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'RFQ_CREATED',
      entityType: 'RFQ',
      entityId: created.id,
    })

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: i18nText(language, 'تم إنشاء طلب عرض السعر', 'RFQ created successfully'),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to create RFQ:', error)
    return NextResponse.json({ success: false, error: 'Failed to create RFQ' }, { status: 500 })
  }
}

