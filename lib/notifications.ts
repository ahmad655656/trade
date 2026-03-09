import { NotificationType } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'

export async function notifyUsers(params: {
  userIds: string[]
  type: NotificationType
  title: string
  message?: string
  data?: unknown
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

