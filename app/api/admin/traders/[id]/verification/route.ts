import { NextResponse } from 'next/server'
import { z } from 'zod'
import { NotificationType, Role, UserStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { sanitizePlainText } from '@/lib/sanitize'
import { notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'
import { sendAccountApprovedEmail } from '@/lib/email'
import { isSchemaOutOfSyncError, SCHEMA_OUT_OF_SYNC_MESSAGE } from '@/lib/prisma-errors'

type Params = { params: Promise<{ id: string }> }

const decisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().trim().max(2000).optional(),
})

export async function GET(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const verification = await prisma.traderVerification.findUnique({
      where: { traderId: id },
      include: {
        trader: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, status: true } },
          },
        },
      },
    })

    if (!verification) {
      return NextResponse.json({ success: false, error: i18nText(language, 'ملف التوثيق غير موجود', 'Verification record not found') }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: verification })
  } catch (error) {
    console.error('Failed to load trader verification:', error)
    if (isSchemaOutOfSyncError(error)) {
      return NextResponse.json({ success: false, error: SCHEMA_OUT_OF_SYNC_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: 'Failed to load trader verification' }, { status: 500 })
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
    const parsed = decisionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid decision payload' }, { status: 400 })
    }

    const rejectionReason = sanitizePlainText(parsed.data.rejectionReason, 2000)
    const verification = await prisma.traderVerification.findUnique({
      where: { traderId: id },
      include: {
        trader: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    if (!verification) {
      return NextResponse.json({ success: false, error: i18nText(language, 'ملف التوثيق غير موجود', 'Verification record not found') }, { status: 404 })
    }

    const approved = parsed.data.status === 'APPROVED'
    const updated = await prisma.$transaction(async (tx) => {
      const nextVerification = await tx.traderVerification.update({
        where: { id: verification.id },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          reviewedById: user.id,
          reviewedAt: new Date(),
          rejectionReason: approved ? null : rejectionReason || 'Verification rejected',
        },
      })

      if (approved) {
        await tx.user.update({
          where: { id: verification.trader.user.id },
          data: { status: UserStatus.ACTIVE },
        })
      }

      return nextVerification
    })

    await notifyUsers({
      userIds: [verification.trader.user.id],
      type: approved ? NotificationType.KYC_APPROVED : NotificationType.KYC_REJECTED,
      title: approved
        ? i18nText(language, 'تم تفعيل حسابك', 'Your account is activated')
        : i18nText(language, 'تم رفض طلب التفعيل', 'Your activation request was rejected'),
      message: approved
        ? i18nText(language, 'يمكنك الآن تسجيل الدخول والبدء باستخدام المنصة.', 'You can now log in and start using the platform.')
        : i18nText(language, `سبب الرفض: ${rejectionReason || '-'}`, `Rejection reason: ${rejectionReason || '-'}`),
    })

    if (approved) {
      await sendAccountApprovedEmail(verification.trader.user.email, verification.trader.user.name)
    }

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: approved ? 'ADMIN_TRADER_APPROVE' : 'ADMIN_TRADER_REJECT',
      entityType: 'TRADER_VERIFICATION',
      entityId: verification.id,
      metadata: {
        traderId: verification.traderId,
        rejectionReason: approved ? null : rejectionReason || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: approved
        ? i18nText(language, 'تم تفعيل التاجر', 'Trader approved')
        : i18nText(language, 'تم رفض التاجر', 'Trader rejected'),
    })
  } catch (error) {
    console.error('Failed to review trader verification:', error)
    if (isSchemaOutOfSyncError(error)) {
      return NextResponse.json({ success: false, error: SCHEMA_OUT_OF_SYNC_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: 'Failed to review trader verification' }, { status: 500 })
  }
}
