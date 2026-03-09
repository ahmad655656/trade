import { NextResponse } from 'next/server'
import { z } from 'zod'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { sanitizePlainText } from '@/lib/sanitize'
import { notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

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
    const verification = await prisma.supplierVerification.findUnique({
      where: { supplierId: id },
      include: {
        supplier: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!verification) {
      return NextResponse.json({ success: false, error: i18nText(language, 'ملف التوثيق غير موجود', 'Verification record not found') }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: verification })
  } catch (error) {
    console.error('Failed to load supplier verification:', error)
    return NextResponse.json({ success: false, error: 'Failed to load supplier verification' }, { status: 500 })
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
    const verification = await prisma.supplierVerification.findUnique({
      where: { supplierId: id },
      include: {
        supplier: {
          include: { user: { select: { id: true } } },
        },
      },
    })

    if (!verification) {
      return NextResponse.json({ success: false, error: i18nText(language, 'ملف التوثيق غير موجود', 'Verification record not found') }, { status: 404 })
    }

    const approved = parsed.data.status === 'APPROVED'
    const updated = await prisma.$transaction(async (tx) => {
      const nextVerification = await tx.supplierVerification.update({
        where: { id: verification.id },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          reviewedById: user.id,
          reviewedAt: new Date(),
          rejectionReason: approved ? null : rejectionReason || 'KYC rejected',
        },
      })

      await tx.supplier.update({
        where: { id: verification.supplierId },
        data: { verified: approved },
      })

      return nextVerification
    })

    await notifyUsers({
      userIds: [verification.supplier.user.id],
      type: approved ? NotificationType.KYC_APPROVED : NotificationType.KYC_REJECTED,
      title: approved
        ? i18nText(language, 'تم اعتماد توثيق المورد', 'Supplier verification approved')
        : i18nText(language, 'تم رفض توثيق المورد', 'Supplier verification rejected'),
      message: approved
        ? i18nText(language, 'يمكنك الآن الظهور كمورد موثق.', 'You now appear as a verified supplier.')
        : i18nText(language, `سبب الرفض: ${rejectionReason || '-'}`, `Rejection reason: ${rejectionReason || '-'}`),
      data: { supplierId: verification.supplierId, verificationId: verification.id },
      sendEmail: true,
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: approved ? 'ADMIN_KYC_APPROVE' : 'ADMIN_KYC_REJECT',
      entityType: 'SUPPLIER_VERIFICATION',
      entityId: verification.id,
      metadata: {
        supplierId: verification.supplierId,
        rejectionReason: approved ? null : rejectionReason || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: approved
        ? i18nText(language, 'تم اعتماد المورد', 'Supplier approved')
        : i18nText(language, 'تم رفض المورد', 'Supplier rejected'),
    })
  } catch (error) {
    console.error('Failed to review supplier verification:', error)
    return NextResponse.json({ success: false, error: 'Failed to review supplier verification' }, { status: 500 })
  }
}

