import { NextResponse } from 'next/server'
import { Role, UserStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { normalizeSearchTerm } from '@/lib/sanitize'
import { getSessionUser } from '@/lib/session'

function parseRole(value: string | null) {
  if (!value) return null
  const normalized = value.trim().toUpperCase()
  if (normalized === Role.ADMIN || normalized === Role.SUPPLIER || normalized === Role.TRADER) {
    return normalized
  }
  return null
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

    const { searchParams } = new URL(request.url)
    const query = normalizeSearchTerm(searchParams.get('query'))
    const requestedRole = parseRole(searchParams.get('role'))
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '40'), 1), 80)

    const baseWhere = {
      id: { not: user.id },
      status: UserStatus.ACTIVE,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    let users: Array<{
      id: string
      name: string
      email: string
      role: string
      avatar: string | null
    }> = []

    if (user.role === Role.ADMIN) {
      if (requestedRole === Role.ADMIN) {
        return NextResponse.json({ success: true, data: [] })
      }

      users = await prisma.user.findMany({
        where: {
          ...baseWhere,
          role: requestedRole ?? { in: [Role.TRADER, Role.SUPPLIER] },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        take: limit,
      })
    } else {
      if (requestedRole && requestedRole !== Role.ADMIN) {
        return NextResponse.json({ success: true, data: [] })
      }

      users = await prisma.user.findMany({
        where: {
          ...baseWhere,
          role: Role.ADMIN,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        take: limit,
      })
    }

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Failed to list users for messaging:', error)
    return NextResponse.json({ success: false, error: 'Failed to list users' }, { status: 500 })
  }
}
