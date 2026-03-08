import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Role, UserStatus } from '@/lib/prisma-enums'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      supplier: true,
      trader: true,
      admin: true,
    },
  })

  if (!user || user.status !== UserStatus.ACTIVE) {
    return null
  }

  return user
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
  if (role === Role.SUPPLIER) return '/dashboard/supplier'
  return '/dashboard/trader'
}
