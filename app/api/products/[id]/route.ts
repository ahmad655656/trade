import { NotificationType } from '@/lib/prisma-enums'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { productUpdateSchema } from '@/lib/validation'
import { assertSameOrigin } from '@/lib/security'
import { writeAuditLog } from '@/lib/audit'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { notifyAdmins } from '@/lib/notifications'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const user = await getSessionUser()
    if (!user || user.role !== 'SUPPLIER' || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing || existing.supplierId !== user.supplier.id) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid product update payload' },
        { status: 400 },
      )
    }

    const input = parsed.data

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr.trim() } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn?.trim() || null } : {}),
        ...(input.nameAr !== undefined || input.nameEn !== undefined
          ? { name: input.nameEn?.trim() || input.nameAr?.trim() || existing.name }
          : {}),
        ...(input.descriptionAr !== undefined ? { descriptionAr: input.descriptionAr?.trim() || null } : {}),
        ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn?.trim() || null } : {}),
        ...(input.descriptionAr !== undefined || input.descriptionEn !== undefined
          ? { description: input.descriptionEn?.trim() || input.descriptionAr?.trim() || null }
          : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.compareAtPrice !== undefined ? { compareAtPrice: input.compareAtPrice ?? null } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.minOrderQuantity !== undefined ? { minOrderQuantity: input.minOrderQuantity } : {}),
        ...(input.sku !== undefined ? { sku: input.sku?.trim() || null } : {}),
        ...(input.images !== undefined ? { images: input.images } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: updated.id,
    })

    try {
      const language = getRequestLanguage(request)
      await notifyAdmins({
        type: NotificationType.SYSTEM,
        title: i18nText(language, 'تم تحديث منتج', 'Product updated'),
        message: i18nText(
          language,
          `قام المورد ${user.name} بتحديث المنتج ${updated.name} (رقم: ${updated.id}).`,
          `Supplier ${user.name} updated product ${updated.name} (id: ${updated.id}).`,
        ),
        data: {
          productId: updated.id,
          productName: updated.name,
          supplierId: user.supplier.id,
          supplierName: user.name,
        },
      })
    } catch (error) {
      console.error('Failed to notify admins about product update:', error)
    }

    return NextResponse.json({ success: true, data: updated, message: 'Product updated' })
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json({ success: false, error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const user = await getSessionUser()
    if (!user || user.role !== 'SUPPLIER' || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing || existing.supplierId !== user.supplier.id) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.delete({ where: { id } })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'PRODUCT_DELETED',
      entityType: 'PRODUCT',
      entityId: id,
    })

    try {
      const language = getRequestLanguage(request)
      await notifyAdmins({
        type: NotificationType.SYSTEM,
        title: i18nText(language, 'تم حذف منتج', 'Product deleted'),
        message: i18nText(
          language,
          `قام المورد ${user.name} بحذف المنتج (معرف: ${id}).`,
          `Supplier ${user.name} deleted product (id: ${id}).`,
        ),
        data: {
          productId: id,
          supplierId: user.supplier.id,
          supplierName: user.name,
        },
      })
    } catch (error) {
      console.error('Failed to notify admins about product deletion:', error)
    }

    return NextResponse.json({ success: true, message: 'Product deleted' })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 })
  }
}
