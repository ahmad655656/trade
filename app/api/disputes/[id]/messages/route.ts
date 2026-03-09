import { NextResponse } from 'next/server'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { disputeMessageSchema } from '@/lib/validation'
import { sanitizePlainText, sanitizeStringArray } from '@/lib/sanitize'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

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
        trader: { select: { userId: true } },
      },
    })

    if (!dispute) {
      return NextResponse.json({ success: false, error: i18nText(language, 'النزاع غير موجود', 'Dispute not found') }, { status: 404 })
    }

    if (!canAccessDispute(user, dispute)) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 403 })
    }

    const messages = await prisma.disputeMessage.findMany({
      where: { disputeId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error('Failed to list dispute messages:', error)
    return NextResponse.json({ success: false, error: 'Failed to list dispute messages' }, { status: 500 })
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
    if (!user) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        trader: { select: { userId: true } },
        supplier: { select: { user: { select: { id: true } } } },
      },
    })

    if (!dispute) {
      return NextResponse.json({ success: false, error: i18nText(language, 'النزاع غير موجود', 'Dispute not found') }, { status: 404 })
    }

    if (!canAccessDispute(user, dispute)) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 403 })
    }

    const body = await request.json()
    const parsed = disputeMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid message payload' }, { status: 400 })
    }

    const message = sanitizePlainText(parsed.data.message, 4000)
    const attachments = sanitizeStringArray(parsed.data.attachments, 10, 600)

    const created = await prisma.disputeMessage.create({
      data: {
        disputeId: dispute.id,
        authorId: user.id,
        message,
        attachments,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    })

    if (attachments.length) {
      await prisma.disputeAttachment.createMany({
        data: attachments.map((fileUrl) => ({
          disputeId: dispute.id,
          fileUrl,
          uploadedById: user.id,
        })),
      })
    }

    const recipientUserIds = [dispute.trader.userId, dispute.supplier?.user.id].filter((value): value is string => Boolean(value) && value !== user.id)
    await notifyUsers({
      userIds: recipientUserIds,
      type: NotificationType.DISPUTE_UPDATED,
      title: i18nText(language, 'رسالة جديدة في النزاع', 'New dispute message'),
      message: i18nText(language, 'تمت إضافة رسالة جديدة إلى محادثة النزاع.', 'A new message was added to the dispute thread.'),
      data: { disputeId: dispute.id },
    })

    await notifyAdmins({
      type: NotificationType.DISPUTE_UPDATED,
      title: i18nText(language, 'تحديث جديد في النزاع', 'Dispute thread updated'),
      message: i18nText(language, `تمت إضافة رسالة جديدة من ${user.name}`, `A new message was posted by ${user.name}`),
      data: { disputeId: dispute.id },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'DISPUTE_MESSAGE_POSTED',
      entityType: 'DISPUTE',
      entityId: dispute.id,
      metadata: {
        messageLength: message.length,
        attachmentsCount: attachments.length,
      },
    })

    return NextResponse.json({ success: true, data: created, message: i18nText(language, 'تم إرسال الرسالة', 'Message sent') }, { status: 201 })
  } catch (error) {
    console.error('Failed to send dispute message:', error)
    return NextResponse.json({ success: false, error: 'Failed to send dispute message' }, { status: 500 })
  }
}

