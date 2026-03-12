import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { Role, UserStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { isMissingColumnError } from '@/lib/prisma-errors'

const ROLE_VALUES = [Role.ADMIN, Role.SUPPLIER, Role.TRADER] as const
const USER_STATUS_VALUES = [UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.BANNED, UserStatus.PENDING_VERIFICATION] as const

type RoleValue = (typeof ROLE_VALUES)[number]
type UserStatusValue = (typeof USER_STATUS_VALUES)[number]

function isRoleValue(value: string): value is RoleValue {
  return ROLE_VALUES.includes(value as RoleValue)
}

function isUserStatusValue(value: string): value is UserStatusValue {
  return USER_STATUS_VALUES.includes(value as UserStatusValue)
}

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')?.trim()
    const status = searchParams.get('status')?.trim()
    const search = searchParams.get('search')?.trim()

    const where: Prisma.UserWhereInput = {
      ...(role && isRoleValue(role) ? { role } : {}),
      ...(status && isUserStatusValue(status) ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    let users: Array<{
      id: string
      name: string
      email: string
      phone: string | null
      role: string
      status: string
      lastLogin: Date | null
      createdAt: Date
    }>

    try {
      users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
    } catch (error) {
      if (!isMissingColumnError(error)) throw error

      const fallbackUsers = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })

      users = fallbackUsers.map((item) => ({
        ...item,
        lastLogin: null,
      }))
    }

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Failed to list users:', error)
    return NextResponse.json({ success: false, error: 'Failed to list users' }, { status: 500 })
  }
}
