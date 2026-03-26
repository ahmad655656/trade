import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Role, UserStatus } from '@/lib/prisma-enums'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { isMissingColumnError } from '@/lib/prisma-errors'

const sessionUserBaseSelect = {
  id: true,
  email: true,
  password: true,
  name: true,
  role: true,
  phone: true,
  avatar: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  supplier: true,
  trader: true,
  admin: true,
} satisfies Prisma.UserSelect

const sessionUserExtendedSelect = {
  ...sessionUserBaseSelect,
  twoFactorAuth: true,
  twoFactorSecret: true,
  emailNotifications: true,
  lastLogin: true,
} satisfies Prisma.UserSelect

type SessionUserBaseRecord = Prisma.UserGetPayload<{ select: typeof sessionUserBaseSelect }>
type SessionUserExtendedRecord = Prisma.UserGetPayload<{ select: typeof sessionUserExtendedSelect }>
export type SessionUser = SessionUserBaseRecord & {
  twoFactorAuth: boolean
  twoFactorSecret: string | null
  emailNotifications: boolean
  lastLogin: Date | null
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  let user: SessionUserBaseRecord | SessionUserExtendedRecord | null = null
  try {
    user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: sessionUserExtendedSelect,
    })
  } catch (error) {
    if (!isMissingColumnError(error)) throw error
    user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: sessionUserBaseSelect,
    })
  }

  if (!user || user.status !== UserStatus.ACTIVE) {
    return null
  }

  return {
    ...user,
    twoFactorAuth: 'twoFactorAuth' in user ? user.twoFactorAuth : false,
    twoFactorSecret: 'twoFactorSecret' in user ? user.twoFactorSecret : null,
    emailNotifications: 'emailNotifications' in user ? user.emailNotifications : false,
    lastLogin: 'lastLogin' in user ? user.lastLogin : null,
  } satisfies SessionUser
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) {
    redirect('/forbidden')
  }
  return user
}

export function getRoleDashboardPath(role: Role) {
  if (role === Role.ADMIN) return '/dashboard/admin'
  if (role === Role.SUPPLIER) return '/supplier'
  return '/trader'
}
