import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { kycSubmissionSchema } from '@/lib/validation'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { sanitizePlainText } from '@/lib/sanitize'
import { notifyAdmins } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const supplier = user.supplier
    const verification = await prisma.supplierVerification.findUnique({
      where: { supplierId: supplier.id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json({ success: true, data: verification })
  } catch (error) {
    console.error('Failed to load KYC:', error)
    return NextResponse.json({ success: false, error: 'Failed to load KYC' }, { status: 500 })
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
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const supplier = user.supplier
    const body = await request.json()
    const parsed = kycSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid KYC payload' },
        { status: 400 },
      )
    }

    const payload = parsed.data
    const updated = await prisma.$transaction(async (tx: TxClient) => {
      const verification = await tx.supplierVerification.upsert({
        where: { supplierId: supplier.id },
        create: {
          supplierId: supplier.id,
          status: 'UNDER_REVIEW',
          phoneVerified: payload.phoneVerified ?? false,
          addressVerified: payload.addressVerified ?? false,
        },
        update: {
          status: 'UNDER_REVIEW',
          phoneVerified: payload.phoneVerified ?? false,
          addressVerified: payload.addressVerified ?? false,
          rejectionReason: null,
        },
      })

      if (payload.documents?.length) {
        await tx.supplierVerificationDocument.createMany({
          data: payload.documents.map((doc) => ({
            verificationId: verification.id,
            type: doc.type,
            fileUrl: sanitizePlainText(doc.fileUrl, 600),
          })),
        })
      }

      await tx.supplier.update({
        where: { id: supplier.id },
        data: {
          verified: false,
        },
      })

      return tx.supplierVerification.findUnique({
        where: { id: verification.id },
        include: { documents: { orderBy: { createdAt: 'desc' } } },
      })
    })

    await notifyAdmins({
      type: NotificationType.SYSTEM,
      title: i18nText(language, 'طلب توثيق مورد جديد', 'New supplier KYC submission'),
      message: i18nText(
        language,
        `أرسل المورد ${user.name} ملف التوثيق للمراجعة.`,
        `Supplier ${user.name} submitted KYC for review.`,
      ),
      data: {
        supplierId: supplier.id,
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'SUPPLIER_KYC_SUBMITTED',
      entityType: 'SUPPLIER_VERIFICATION',
      entityId: updated?.id || null,
      metadata: {
        supplierId: supplier.id,
        documentsCount: payload.documents?.length ?? 0,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: i18nText(language, 'تم إرسال ملف التوثيق للمراجعة', 'KYC submitted for review'),
    })
  } catch (error) {
    console.error('Failed to submit KYC:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit KYC' }, { status: 500 })
  }
}
