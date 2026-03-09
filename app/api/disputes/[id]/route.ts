import { NextResponse } from 'next/server'
import { z } from 'zod'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { sanitizePlainText } from '@/lib/sanitize'
import { appendOrderTimelineEvent } from '@/lib/order-timeline'
import { notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }
type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

const updateSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED']),
  resolutionSummary: z.string().trim().max(4000).optional(),
})

function canAccessDispute(user: Awaited<ReturnType<typeof getSessionUser>>, dispute: {
  trader: { userId: string }
  supplierId: string | null
}) {
  if (!user) return false
  if (user.role === Role.ADMIN) return true
  if (user.role === Role.TRADER && user.trader && dispute.trader.userId === user.id) return true
  if (user.role === Role.SUPPLIER && user.supplier && dispute.supplierId === user.supplier.id) return true
  return false
}

export async function GET(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
          },
        },
        trader: { select: { id: true, userId: true, user: { select: { id: true, name: true } } } },
        supplier: { select: { id: true, user: { select: { id: true, name: true } } } },
        attachments: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json({ success: false, error: i18nText(language, 'النزاع غير موجود', 'Dispute not found') }, { status: 404 })
    }

    if (!canAccessDispute(user, dispute)) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: dispute })
  } catch (error) {
    console.error('Failed to load dispute details:', error)
    return NextResponse.json({ success: false, error: 'Failed to load dispute details' }, { status: 500 })
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
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid update payload' }, { status: 400 })
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: true,
        trader: { select: { userId: true } },
        supplier: { select: { user: { select: { id: true } } } },
      },
    })

    if (!dispute) {
      return NextResponse.json({ success: false, error: i18nText(language, 'النزاع غير موجود', 'Dispute not found') }, { status: 404 })
    }

    const resolutionSummary = sanitizePlainText(parsed.data.resolutionSummary, 4000)

    const updated = await prisma.$transaction(async (tx: TxClient) => {
      const nextDispute = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: parsed.data.status,
          resolutionSummary:
            parsed.data.status === 'RESOLVED' || parsed.data.status === 'REJECTED'
              ? resolutionSummary || null
              : dispute.resolutionSummary,
          resolvedById:
            parsed.data.status === 'RESOLVED' || parsed.data.status === 'REJECTED'
              ? user.id
              : dispute.resolvedById,
          resolvedAt:
            parsed.data.status === 'RESOLVED' || parsed.data.status === 'REJECTED'
              ? new Date()
              : dispute.resolvedAt,
        },
      })

      if (parsed.data.status === 'RESOLVED') {
        await tx.order.update({
          where: { id: dispute.orderId },
          data: {
            status: 'ORDER_CLOSED',
            closedAt: new Date(),
          },
        })

        await appendOrderTimelineEvent(tx, {
          orderId: dispute.orderId,
          status: 'ORDER_CLOSED',
          actorUserId: user.id,
          language,
          note: i18nText(language, 'تم حل النزاع وإغلاق الطلب', 'Dispute resolved and order closed'),
        })
      }

      if (parsed.data.status === 'REJECTED' && dispute.order.status === 'DISPUTE_OPENED') {
        await tx.order.update({
          where: { id: dispute.orderId },
          data: {
            status: 'AWAITING_DELIVERY_CONFIRMATION',
          },
        })
      }

      return nextDispute
    })

    const notifyIds = [
      dispute.trader.userId,
      ...(dispute.supplier ? [dispute.supplier.user.id] : []),
    ]
    await notifyUsers({
      userIds: notifyIds,
      type: NotificationType.DISPUTE_UPDATED,
      title: i18nText(language, 'تحديث على النزاع', 'Dispute updated'),
      message: i18nText(language, `تم تحديث حالة النزاع إلى ${parsed.data.status}`, `Dispute status changed to ${parsed.data.status}`),
      data: { disputeId: dispute.id, orderId: dispute.orderId, status: parsed.data.status },
      sendEmail: true,
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'ADMIN_UPDATE_DISPUTE',
      entityType: 'DISPUTE',
      entityId: dispute.id,
      metadata: {
        status: parsed.data.status,
        resolutionSummary: resolutionSummary || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: i18nText(language, 'تم تحديث النزاع', 'Dispute updated'),
    })
  } catch (error) {
    console.error('Failed to update dispute:', error)
    return NextResponse.json({ success: false, error: 'Failed to update dispute' }, { status: 500 })
  }
}

