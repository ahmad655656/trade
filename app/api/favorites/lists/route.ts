import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { favoriteListCreateSchema } from '@/lib/validation'
import { sanitizePlainText } from '@/lib/sanitize'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const lists = await prisma.favoriteList.findMany({
      where: { traderId: user.trader.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                nameEn: true,
                price: true,
              },
            },
            supplier: {
              select: {
                id: true,
                companyName: true,
                verified: true,
                user: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: lists })
  } catch (error) {
    console.error('Failed to list favorite lists:', error)
    return NextResponse.json({ success: false, error: 'Failed to list favorite lists' }, { status: 500 })
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
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const body = await request.json()
    const parsed = favoriteListCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid list payload' }, { status: 400 })
    }

    const created = await prisma.favoriteList.create({
      data: {
        traderId: user.trader.id,
        name: sanitizePlainText(parsed.data.name, 80),
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'FAVORITE_LIST_CREATED',
      entityType: 'FAVORITE_LIST',
      entityId: created.id,
      metadata: { name: created.name },
    })

    return NextResponse.json({
      success: true,
      data: created,
      message: i18nText(language, 'تم إنشاء القائمة', 'Favorite list created'),
    })
  } catch (error) {
    console.error('Failed to create favorite list:', error)
    return NextResponse.json({ success: false, error: 'Failed to create favorite list' }, { status: 500 })
  }
}

