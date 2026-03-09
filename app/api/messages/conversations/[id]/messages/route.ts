import { NextResponse } from 'next/server'
import { z } from 'zod'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { sanitizePlainText, sanitizeStringArray } from '@/lib/sanitize'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

const messageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  attachments: z.array(z.string().trim()).max(10).optional(),
})

function isAllowedRolePair(roleA: string, roleB: string) {
  return (
    (roleA === Role.ADMIN && (roleB === Role.TRADER || roleB === Role.SUPPLIER)) ||
    (roleB === Role.ADMIN && (roleA === Role.TRADER || roleA === Role.SUPPLIER))
  )
}

async function ensureAllowedMembership(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      participants: {
        include: {
          user: { select: { id: true, role: true } },
        },
      },
    },
  })

  if (!conversation) return false

  const participants = conversation.participants.map((item) => item.user)
  if (!participants.some((participant) => participant.id === userId)) return false
  if (participants.length !== 2) return false

  return isAllowedRolePair(participants[0]?.role, participants[1]?.role)
}

export async function GET(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Unauthorized', 'Unauthorized') },
        { status: 401 },
      )
    }

    const { id } = await params
    const member = await ensureAllowedMembership(id, user.id)
    if (!member) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Conversation access denied', 'Conversation access denied') },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '100'), 1), 200)
    const since = searchParams.get('since')
    const where = {
      conversationId: id,
      ...(since ? { createdAt: { gte: new Date(since) } } : {}),
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, role: true, avatar: true } },
      },
    })

    await prisma.message.updateMany({
      where: {
        conversationId: id,
        senderId: { not: user.id },
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error('Failed to list messages:', error)
    return NextResponse.json({ success: false, error: 'Failed to list messages' }, { status: 500 })
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
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Unauthorized', 'Unauthorized') },
        { status: 401 },
      )
    }

    const { id } = await params
    const member = await ensureAllowedMembership(id, user.id)
    if (!member) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Conversation access denied', 'Conversation access denied') },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid message payload' },
        { status: 400 },
      )
    }

    const content = sanitizePlainText(parsed.data.content, 4000)
    const attachments = sanitizeStringArray(parsed.data.attachments, 10, 600)

    const created = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: user.id,
        content,
        attachments,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, avatar: true } },
      },
    })

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: id },
      select: { userId: true },
    })
    const recipientIds = participants.map((item) => item.userId).filter((recipient) => recipient !== user.id)

    await Promise.all([
      prisma.conversation.update({
        where: { id },
        data: {
          lastMessage: content,
          lastMessageAt: created.createdAt,
        },
      }),
      prisma.notification.createMany({
        data: recipientIds.map((recipientId) => ({
          userId: recipientId,
          type: NotificationType.MESSAGE_RECEIVED,
          title: i18nText(language, 'New message', 'New message'),
          message: content.slice(0, 180),
          data: { conversationId: id },
        })),
      }),
    ])

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'MESSAGE_SENT',
      entityType: 'CONVERSATION',
      entityId: id,
      metadata: {
        messageId: created.id,
        attachmentsCount: attachments.length,
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('Failed to send message:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  }
}
