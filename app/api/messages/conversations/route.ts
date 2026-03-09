import { NextResponse } from 'next/server'
import { z } from 'zod'
import { NotificationType, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { sanitizePlainText } from '@/lib/sanitize'
import { writeAuditLog } from '@/lib/audit'

const createConversationSchema = z.object({
  participantUserId: z.string().trim().min(1),
  orderId: z.string().trim().optional(),
  initialMessage: z.string().trim().max(4000).optional(),
})

function isAllowedRolePair(roleA: string, roleB: string) {
  return (
    (roleA === Role.ADMIN && (roleB === Role.TRADER || roleB === Role.SUPPLIER)) ||
    (roleB === Role.ADMIN && (roleA === Role.TRADER || roleA === Role.SUPPLIER))
  )
}

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Unauthorized', 'Unauthorized') },
        { status: 401 },
      )
    }

    const memberships = await prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, role: true, avatar: true } },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
            order: {
              select: { id: true, orderNumber: true, status: true },
            },
          },
        },
      },
      orderBy: {
        conversation: { lastMessageAt: 'desc' },
      },
    })

    const data = memberships
      .filter((membership) => {
        const participants = membership.conversation.participants
        if (participants.length !== 2) return false
        return isAllowedRolePair(participants[0]?.user.role, participants[1]?.user.role)
      })
      .map((membership) => {
        const unreadCount = membership.conversation.messages.filter(
          (message) => !message.read && message.senderId !== user.id,
        ).length

        return {
          id: membership.conversation.id,
          order: membership.conversation.order,
          lastMessage: membership.conversation.lastMessage,
          lastMessageAt: membership.conversation.lastMessageAt,
          unreadCount,
          participants: membership.conversation.participants.map((item) => item.user),
        }
      })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to list conversations:', error)
    return NextResponse.json({ success: false, error: 'Failed to list conversations' }, { status: 500 })
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
    if (!user) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Unauthorized', 'Unauthorized') },
        { status: 401 },
      )
    }

    const body = await request.json()
    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
        { status: 400 },
      )
    }

    const participantUserId = parsed.data.participantUserId
    const orderId = parsed.data.orderId?.trim() || null
    const initialMessage = sanitizePlainText(parsed.data.initialMessage, 4000)

    if (participantUserId === user.id) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Cannot chat with yourself', 'Cannot chat with yourself') },
        { status: 400 },
      )
    }

    const participant = await prisma.user.findUnique({
      where: { id: participantUserId },
      select: { id: true, role: true },
    })

    if (!participant) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'Participant not found', 'Participant not found') },
        { status: 404 },
      )
    }

    if (!isAllowedRolePair(user.role, participant.role)) {
      return NextResponse.json(
        {
          success: false,
          error: i18nText(
            language,
            'Messaging is allowed only between Admin and Trader or Admin and Supplier',
            'Messaging is allowed only between Admin and Trader or Admin and Supplier',
          ),
        },
        { status: 403 },
      )
    }

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          trader: { include: { user: { select: { id: true } } } },
          items: { include: { supplier: { include: { user: { select: { id: true } } } } } },
        },
      })

      if (!order) {
        return NextResponse.json(
          { success: false, error: i18nText(language, 'Order not found', 'Order not found') },
          { status: 404 },
        )
      }

      const orderUserIds = new Set([order.trader.user.id, ...order.items.map((item) => item.supplier.user.id)])
      const nonAdminUserId = user.role === Role.ADMIN ? participantUserId : user.id

      if (!orderUserIds.has(nonAdminUserId)) {
        return NextResponse.json(
          {
            success: false,
            error: i18nText(
              language,
              'Not allowed for this order conversation',
              'Not allowed for this order conversation',
            ),
          },
          { status: 403 },
        )
      }
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        orderId,
        participants: {
          every: { userId: { in: [user.id, participantUserId] } },
        },
      },
      include: {
        participants: true,
      },
    })

    if (existing && existing.participants.length === 2) {
      return NextResponse.json({ success: true, data: existing, message: 'Conversation already exists' })
    }

    const created = await prisma.conversation.create({
      data: {
        orderId,
        participants: {
          create: [{ userId: user.id }, { userId: participantUserId }],
        },
        ...(initialMessage
          ? {
              lastMessage: initialMessage,
              lastMessageAt: new Date(),
              messages: {
                create: {
                  senderId: user.id,
                  content: initialMessage,
                  attachments: [],
                },
              },
            }
          : {}),
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, role: true, avatar: true } } } },
        order: { select: { id: true, orderNumber: true } },
      },
    })

    if (initialMessage) {
      await prisma.notification.create({
        data: {
          userId: participantUserId,
          type: NotificationType.MESSAGE_RECEIVED,
          title: i18nText(language, 'New message', 'New message'),
          message: initialMessage,
          data: { conversationId: created.id, orderId },
        },
      })
    }

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'CONVERSATION_CREATED',
      entityType: 'CONVERSATION',
      entityId: created.id,
      metadata: { participantUserId, orderId },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('Failed to create conversation:', error)
    return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 })
  }
}
