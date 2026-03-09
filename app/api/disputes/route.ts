import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { disputeCreateSchema } from '@/lib/validation'
import { sanitizePlainText, sanitizeStringArray } from '@/lib/sanitize'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

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
            ? {
                OR: [{ supplierId: user.supplier.id }, { order: { items: { some: { supplierId: user.supplier.id } } } }],
              }
            : { id: '__none__' }

    const disputes = await prisma.dispute.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
          },
        },
        trader: { select: { id: true, user: { select: { id: true, name: true } } } },
        supplier: { select: { id: true, user: { select: { id: true, name: true } } } },
        attachments: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 5,
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: disputes })
  } catch (error) {
    console.error('Failed to list disputes:', error)
    return NextResponse.json({ success: false, error: 'Failed to list disputes' }, { status: 500 })
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
    const parsed = disputeCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid dispute payload' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: {
        items: {
          include: {
            supplier: { include: { user: { select: { id: true } } } },
          },
        },
      },
    })

    if (!order || order.traderId !== user.trader.id) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
    }

    if (!['AWAITING_DELIVERY_CONFIRMATION', 'DELIVERED', 'ORDER_CLOSED'].includes(order.status)) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'لا يمكن فتح نزاع في الحالة الحالية', 'Dispute cannot be opened for current order state') },
        { status: 400 },
      )
    }

    const supplierIds = Array.from(new Set(order.items.map((item) => item.supplierId)))
    const supplierId = supplierIds.length === 1 ? supplierIds[0] : null
    const description = sanitizePlainText(parsed.data.description, 4000)
    const images = sanitizeStringArray(parsed.data.images, 10, 600)

    const created = await prisma.$transaction(async (tx: TxClient) => {
      const dispute = await tx.dispute.create({
        data: {
          orderId: order.id,
          traderId: user.trader!.id,
          supplierId,
          reason: parsed.data.reason,
          status: 'OPEN',
          description,
          attachments: {
            create: images.map((url) => ({
              fileUrl: url,
              uploadedById: user.id,
            })),
          },
          messages: {
            create: {
              authorId: user.id,
              message: description,
              attachments: images,
            },
          },
        },
        include: {
          attachments: true,
        },
      })

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DISPUTE_OPENED',
          disputeOpenedAt: new Date(),
        },
      })

      await appendOrderTimelineEvent(tx, {
        orderId: order.id,
        status: 'DISPUTE_OPENED',
        actorUserId: user.id,
        language,
        note: i18nText(language, 'تم فتح نزاع من قبل التاجر', 'Dispute opened by merchant'),
      })

      return dispute
    })

    const supplierUserIds = Array.from(new Set(order.items.map((item) => item.supplier.user.id)))
    await notifyAdmins({
      type: NotificationType.DISPUTE_OPENED,
      title: i18nText(language, `نزاع جديد على الطلب ${order.orderNumber}`, `New dispute on order ${order.orderNumber}`),
      message: i18nText(language, 'تم فتح نزاع جديد ويتطلب تدخل الإدارة.', 'A new dispute has been opened and needs admin intervention.'),
      data: { disputeId: created.id, orderId: order.id, orderNumber: order.orderNumber },
    })

    await notifyUsers({
      userIds: supplierUserIds,
      type: NotificationType.DISPUTE_OPENED,
      title: i18nText(language, `نزاع على الطلب ${order.orderNumber}`, `Dispute opened for ${order.orderNumber}`),
      message: i18nText(language, 'فتح التاجر نزاعًا على هذا الطلب.', 'Merchant opened a dispute on this order.'),
      data: { disputeId: created.id, orderId: order.id, orderNumber: order.orderNumber },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'DISPUTE_OPENED',
      entityType: 'DISPUTE',
      entityId: created.id,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: parsed.data.reason,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: i18nText(language, 'تم فتح النزاع بنجاح', 'Dispute opened successfully'),
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to create dispute:', error)
    return NextResponse.json({ success: false, error: 'Failed to create dispute' }, { status: 500 })
  }
}

