import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { orderReviewSchema } from '@/lib/validation'
import { sanitizePlainText, sanitizeStringArray } from '@/lib/sanitize'
import { notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
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

    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            supplier: { include: { user: { select: { id: true } } } },
            product: { select: { id: true } },
          },
        },
      },
    })

    if (!order || order.traderId !== user.trader.id) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الطلب غير موجود', 'Order not found') }, { status: 404 })
    }

    if (order.status !== 'ORDER_CLOSED') {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يمكنك التقييم بعد إغلاق الطلب فقط', 'You can review only after order closure') },
        { status: 400 },
      )
    }

    const mainSupplier = order.items[0]?.supplier
    if (!mainSupplier) {
      return NextResponse.json({ success: false, error: i18nText(language, 'لا يوجد مورد مرتبط', 'No supplier linked to this order') }, { status: 400 })
    }

    const body = await request.json()
    const parsed = orderReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid review payload' }, { status: 400 })
    }

    const payload = parsed.data
    const review = await prisma.review.upsert({
      where: {
        id: `${order.id}:${user.id}:${mainSupplier.id}`,
      },
      create: {
        id: `${order.id}:${user.id}:${mainSupplier.id}`,
        orderId: order.id,
        fromUserId: user.id,
        toSupplierId: mainSupplier.id,
        toProductId: order.items[0]?.product.id || null,
        rating: payload.rating,
        qualityRating: payload.qualityRating,
        deliverySpeedRating: payload.deliverySpeedRating,
        descriptionAccuracyRating: payload.descriptionAccuracyRating,
        communicationRating: payload.communicationRating,
        title: sanitizePlainText(payload.title, 200) || null,
        comment: sanitizePlainText(payload.comment, 4000) || null,
        images: sanitizeStringArray(payload.images, 10, 600),
      },
      update: {
        rating: payload.rating,
        qualityRating: payload.qualityRating,
        deliverySpeedRating: payload.deliverySpeedRating,
        descriptionAccuracyRating: payload.descriptionAccuracyRating,
        communicationRating: payload.communicationRating,
        title: sanitizePlainText(payload.title, 200) || null,
        comment: sanitizePlainText(payload.comment, 4000) || null,
        images: sanitizeStringArray(payload.images, 10, 600),
      },
    })

    const [supplierRatingAgg, supplierReviewCount] = await Promise.all([
      prisma.review.aggregate({
        where: { toSupplierId: mainSupplier.id, status: 'ACTIVE' },
        _avg: { rating: true },
      }),
      prisma.review.count({
        where: { toSupplierId: mainSupplier.id, status: 'ACTIVE' },
      }),
    ])

    await prisma.supplier.update({
      where: { id: mainSupplier.id },
      data: {
        rating: supplierRatingAgg._avg.rating ?? 0,
        totalReviews: supplierReviewCount,
      },
    })

    await notifyUsers({
      userIds: [mainSupplier.user.id],
      type: NotificationType.REVIEW_RECEIVED,
      title: i18nText(language, 'وصلك تقييم جديد', 'New review received'),
      message: i18nText(language, `تمت إضافة تقييم جديد للطلب ${order.orderNumber}.`, `A new review was submitted for order ${order.orderNumber}.`),
      data: { orderId: order.id, reviewId: review.id },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'ORDER_REVIEW_SUBMITTED',
      entityType: 'REVIEW',
      entityId: review.id,
      metadata: {
        orderId: order.id,
        supplierId: mainSupplier.id,
        rating: payload.rating,
      },
    })

    return NextResponse.json({
      success: true,
      data: review,
      message: i18nText(language, 'تم إرسال التقييم', 'Review submitted'),
    })
  } catch (error) {
    console.error('Failed to submit review:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit review' }, { status: 500 })
  }
}

