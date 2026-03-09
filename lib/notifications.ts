import { NotificationType } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { isMissingColumnError } from '@/lib/prisma-errors'

async function sendEmailNotification(params: {
  toUserIds: string[]
  subject: string
  body: string
}) {
  if (!params.toUserIds.length) return

  let users: Array<{ email: string }> = []
  try {
    users = await prisma.user.findMany({
      where: {
        id: { in: params.toUserIds },
        emailNotifications: true,
      },
      select: { email: true },
    })
  } catch (error) {
    if (!isMissingColumnError(error)) throw error
    return
  }

  if (!users.length) return

  // Placeholder hook for SMTP/provider integration.
  console.log('Email notifications queued:', {
    to: users.map((item) => item.email),
    subject: params.subject,
  })
}

export async function notifyUsers(params: {
  userIds: string[]
  type: NotificationType
  title: string
  message?: string
  data?: unknown
  sendEmail?: boolean
}) {
  const ids = Array.from(new Set(params.userIds.filter(Boolean)))
  if (!ids.length) return

  await prisma.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data as object | undefined,
    })),
  })

  if (params.sendEmail) {
    await sendEmailNotification({
      toUserIds: ids,
      subject: params.title,
      body: params.message ?? params.title,
    })
  }
}

export async function notifyAdmins(params: {
  type: NotificationType
  title: string
  message?: string
  data?: unknown
}) {
  const admins: Array<{ id: string }> = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  })

  await notifyUsers({
    userIds: admins.map((admin: { id: string }) => admin.id),
    type: params.type,
    title: params.title,
    message: params.message,
    data: params.data,
  })
}

