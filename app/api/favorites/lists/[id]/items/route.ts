import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { assertSameOrigin } from '@/lib/security'
import { favoriteListItemSchema } from '@/lib/validation'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { writeAuditLog } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const list = await prisma.favoriteList.findFirst({
      where: { id, traderId: user.trader.id },
    })
    if (!list) {
      return NextResponse.json({ success: false, error: i18nText(language, 'القائمة غير موجودة', 'List not found') }, { status: 404 })
    }

    const items = await prisma.favoriteListItem.findMany({
      where: { listId: id },
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
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Failed to list favorite list items:', error)
    return NextResponse.json({ success: false, error: 'Failed to list favorite items' }, { status: 500 })
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
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const list = await prisma.favoriteList.findFirst({
      where: { id, traderId: user.trader.id },
    })
    if (!list) {
      return NextResponse.json({ success: false, error: i18nText(language, 'القائمة غير موجودة', 'List not found') }, { status: 404 })
    }

    const body = await request.json()
    const parsed = favoriteListItemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid item payload' }, { status: 400 })
    }

    if (parsed.data.targetType === 'PRODUCT') {
      const exists = await prisma.product.findUnique({ where: { id: parsed.data.productId } })
      if (!exists) {
        return NextResponse.json({ success: false, error: i18nText(language, 'المنتج غير موجود', 'Product not found') }, { status: 404 })
      }
    }

    if (parsed.data.targetType === 'SUPPLIER') {
      const exists = await prisma.supplier.findUnique({ where: { id: parsed.data.supplierId } })
      if (!exists) {
        return NextResponse.json({ success: false, error: i18nText(language, 'المورد غير موجود', 'Supplier not found') }, { status: 404 })
      }
    }

    const created = await prisma.favoriteListItem.create({
      data: {
        listId: id,
        targetType: parsed.data.targetType,
        productId: parsed.data.targetType === 'PRODUCT' ? parsed.data.productId || null : null,
        supplierId: parsed.data.targetType === 'SUPPLIER' ? parsed.data.supplierId || null : null,
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'FAVORITE_LIST_ITEM_ADDED',
      entityType: 'FAVORITE_LIST_ITEM',
      entityId: created.id,
      metadata: {
        listId: id,
        targetType: parsed.data.targetType,
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('Failed to add favorite list item:', error)
    return NextResponse.json({ success: false, error: 'Failed to add favorite item' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
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

    const { id } = await params
    const list = await prisma.favoriteList.findFirst({
      where: { id, traderId: user.trader.id },
    })
    if (!list) {
      return NextResponse.json({ success: false, error: i18nText(language, 'القائمة غير موجودة', 'List not found') }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    if (!itemId) {
      return NextResponse.json({ success: false, error: i18nText(language, 'معرّف العنصر مطلوب', 'itemId is required') }, { status: 400 })
    }

    const existing = await prisma.favoriteListItem.findFirst({
      where: { id: itemId, listId: id },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: i18nText(language, 'العنصر غير موجود', 'Item not found') }, { status: 404 })
    }

    await prisma.favoriteListItem.delete({ where: { id: itemId } })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'FAVORITE_LIST_ITEM_REMOVED',
      entityType: 'FAVORITE_LIST_ITEM',
      entityId: itemId,
      metadata: { listId: id },
    })

    return NextResponse.json({ success: true, message: i18nText(language, 'تمت الإزالة', 'Removed') })
  } catch (error) {
    console.error('Failed to delete favorite list item:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove favorite item' }, { status: 500 })
  }
}

