import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { rfqQuoteSchema } from '@/lib/validation'
import { sanitizePlainText } from '@/lib/sanitize'
import { notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

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
        trader: { select: { userId: true } },
      },
    })
    if (!rfq) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'RFQ not found') }, { status: 404 })
    }

    if (user.role !== Role.ADMIN) {
      if (user.role === Role.TRADER && rfq.trader.userId !== user.id) {
        return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 403 })
      }
    }

    const quotes = await prisma.rfqQuote.findMany({
      where: { rfqId: id },
      include: {
        supplier: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: quotes })
  } catch (error) {
    console.error('Failed to list RFQ quotes:', error)
    return NextResponse.json({ success: false, error: 'Failed to list RFQ quotes' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: {
        trader: { include: { user: { select: { id: true } } } },
      },
    })
    if (!rfq) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'RFQ not found') }, { status: 404 })
    }

    if (rfq.status === 'CLOSED' || rfq.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: i18nText(language, 'تم إغلاق طلب عرض السعر', 'RFQ is closed') }, { status: 400 })
    }

    const body = await request.json()
    const parsed = rfqQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid quote payload' }, { status: 400 })
    }

    const quote = await prisma.rfqQuote.upsert({
      where: {
        rfqId_supplierId: {
          rfqId: id,
          supplierId: user.supplier.id,
        },
      },
      create: {
        rfqId: id,
        supplierId: user.supplier.id,
        price: parsed.data.price,
        availableQuantity: parsed.data.availableQuantity,
        estimatedShippingDays: parsed.data.estimatedShippingDays,
        notes: sanitizePlainText(parsed.data.notes, 2000) || null,
      },
      update: {
        price: parsed.data.price,
        availableQuantity: parsed.data.availableQuantity,
        estimatedShippingDays: parsed.data.estimatedShippingDays,
        notes: sanitizePlainText(parsed.data.notes, 2000) || null,
      },
    })

    await prisma.rfq.update({
      where: { id },
      data: {
        status: 'QUOTED',
      },
    })

    await notifyUsers({
      userIds: [rfq.trader.user.id],
      type: NotificationType.RFQ_QUOTED,
      title: i18nText(language, 'وصل عرض سعر جديد', 'New quote received'),
      message: i18nText(language, 'تم استلام عرض سعر جديد على طلبك.', 'A supplier submitted a quote to your RFQ.'),
      data: { rfqId: rfq.id, quoteId: quote.id },
      sendEmail: true,
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'RFQ_QUOTE_SUBMITTED',
      entityType: 'RFQ_QUOTE',
      entityId: quote.id,
      metadata: {
        rfqId: rfq.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: quote,
      message: i18nText(language, 'تم إرسال عرض السعر', 'Quote submitted'),
    })
  } catch (error) {
    console.error('Failed to submit RFQ quote:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit RFQ quote' }, { status: 500 })
  }
}

