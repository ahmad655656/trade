import { ProductStatus } from '@/lib/prisma-enums'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { productCreateSchema } from '@/lib/validation'
import { similarity } from '@/lib/search'
import { assertSameOrigin } from '@/lib/security'
import { writeAuditLog } from '@/lib/audit'

type ProductFindManyArgs = NonNullable<Parameters<typeof prisma.product.findMany>[0]>

async function resolveCategoryId(categoryId?: string) {
  if (categoryId) {
    const existing = await prisma.category.findUnique({ where: { id: categoryId } })
    if (existing) return existing.id
  }

  const firstCategory = await prisma.category.findFirst({ select: { id: true } })
  if (firstCategory) return firstCategory.id

  const defaultSlug = 'general'
  const bySlug = await prisma.category.findUnique({ where: { slug: defaultSlug } })
  if (bySlug) return bySlug.id

  const created = await prisma.category.create({
    data: {
      name: 'General',
      nameAr: 'عام',
      nameEn: 'General',
      slug: defaultSlug,
      description: 'Default category for supplier products',
    },
    select: { id: true },
  })

  return created.id
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mine = searchParams.get('mine') === '1'
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '24'), 1), 200)
    const search = searchParams.get('search')?.trim()
    const supplierId = searchParams.get('supplierId') || undefined
    const minPriceRaw = searchParams.get('minPrice')
    const maxPriceRaw = searchParams.get('maxPrice')
    const ratingMinRaw = searchParams.get('ratingMin')
    const minOrderQuantityRaw = searchParams.get('minOrderQuantity')
    const minPrice = minPriceRaw === null || minPriceRaw.trim() === '' ? null : Number(minPriceRaw)
    const maxPrice = maxPriceRaw === null || maxPriceRaw.trim() === '' ? null : Number(maxPriceRaw)
    const ratingMin = ratingMinRaw === null || ratingMinRaw.trim() === '' ? null : Number(ratingMinRaw)
    const minOrderQuantity = minOrderQuantityRaw === null || minOrderQuantityRaw.trim() === '' ? null : Number(minOrderQuantityRaw)
    const inStock = searchParams.get('inStock') === '1'
    const sort = searchParams.get('sort') ?? 'newest'

    const categoryIds = (searchParams.get('categoryIds') || '')
      .split(',')
      .map((v: string) => v.trim())
      .filter(Boolean)

    const where: ProductFindManyArgs['where'] = {}

    if (mine) {
      const user = await getSessionUser()
      if (!user || user.role !== 'SUPPLIER' || !user.supplier) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      where.supplierId = user.supplier.id
    } else {
      where.status = ProductStatus.ACTIVE
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (supplierId) where.supplierId = supplierId
    if (minPrice !== null && !Number.isNaN(minPrice)) where.price = { ...(where.price as object), gte: minPrice }
    if (maxPrice !== null && !Number.isNaN(maxPrice)) where.price = { ...(where.price as object), lte: maxPrice }
    if (ratingMin !== null && !Number.isNaN(ratingMin)) where.rating = { gte: ratingMin }
    if (minOrderQuantity !== null && !Number.isNaN(minOrderQuantity) && minOrderQuantity > 0) where.minOrderQuantity = { lte: minOrderQuantity }
    if (inStock) where.quantity = { gt: 0 }
    if (categoryIds.length) where.categoryId = { in: categoryIds }

    const orderBy: ProductFindManyArgs['orderBy'] =
      sort === 'price_asc'
        ? { price: 'asc' }
        : sort === 'price_desc'
          ? { price: 'desc' }
          : sort === 'best_selling'
            ? { soldCount: 'desc' }
            : sort === 'top_rated'
              ? { rating: 'desc' }
              : { createdAt: 'desc' }

    const productsRaw = await prisma.product.findMany({
      where,
      take: limit,
      orderBy,
      include: {
        category: { select: { id: true, name: true, nameAr: true, nameEn: true } },
        supplier: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    let products =
      sort === 'discount_desc'
        ? [...productsRaw].sort((a, b) => {
            const discountA = (a.compareAtPrice ?? a.price) - a.price
            const discountB = (b.compareAtPrice ?? b.price) - b.price
            return discountB - discountA
          })
        : productsRaw

    if (!mine && search && products.length === 0) {
      const candidates = await prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          ...(supplierId ? { supplierId } : {}),
        },
        take: 120,
        include: {
          category: { select: { id: true, name: true, nameAr: true, nameEn: true } },
          supplier: { include: { user: { select: { id: true, name: true } } } },
        },
      })

      const normalizedSearch = search.toLowerCase()
      products = candidates
        .map((item) => {
          const names = [item.name, item.nameAr || '', item.nameEn || '']
          const score = Math.max(...names.map((name) => similarity(normalizedSearch, name.toLowerCase())))
          return { item, score }
        })
        .filter((entry) => entry.score >= 0.45)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.item)
    }

    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}

import formidable from 'formidable'
import { uploadImageBuffer } from '@/lib/cloudinary'

export async function POST(request: Request) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const user = await getSessionUser()
    if (!user || user.role !== 'SUPPLIER' || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type')
    if (contentType?.includes('multipart/form-data')) {
      // Multipart upload with Node.js fs
      const form = formidable({
        multiples: true,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      })

      const [fields, files] = await form.parse(request as any)

      const images = [] as string[]
      if (files.images) {
        const imageFiles = Array.isArray(files.images) ? files.images : [files.images]
        const fs = await import('fs/promises')
        for (const file of imageFiles as any[]) {
          if (file.filepath) {
            const buffer = await fs.readFile(file.filepath)
            const url = await uploadImageBuffer(buffer, undefined, 'trade/products')
            images.push(url)
            await fs.unlink(file.filepath)
          }
        }
      }

      const input = {
        nameAr: (fields.nameAr as string[])[0] || '',
        nameEn: (fields.nameEn as string[])[0] || '',
        descriptionAr: (fields.descriptionAr as string[])[0] || '',
        price: Number(fields.price),
        quantity: Number(fields.quantity),
        minOrderQuantity: Number(fields.minOrderQuantity || 1),
        sku: (fields.sku as string[])[0] || '',
        images,
      }

      const parsed = productCreateSchema.safeParse(input)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' }, { status: 400 })
      }

      const categoryId = await resolveCategoryId(fields.categoryId?.[0])
      const status = ProductStatus.DRAFT

      const created = await prisma.product.create({
        data: {
          supplierId: user.supplier.id,
          ...parsed.data,
          categoryId,
          status,
        },
        include: { category: { select: { id: true, name: true, nameAr: true, nameEn: true } } },
      })

      await writeAuditLog({
        request,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: created.id,
        metadata: {
          supplierId: user.supplier.id,
        },
      })

      return NextResponse.json({ success: true, data: created }, { status: 201 })
    } else {
      // JSON payload (existing)
      const body = await request.json()
      const parsed = productCreateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid product payload' },
          { status: 400 },
        )
      }

      const input = parsed.data
      const categoryId = await resolveCategoryId(input.categoryId)
      const status = input.status ?? ProductStatus.DRAFT

      const created = await prisma.product.create({
        data: {
          supplierId: user.supplier.id,
          name: input.nameEn?.trim() || input.nameAr.trim(),
          nameAr: input.nameAr.trim(),
          nameEn: input.nameEn?.trim() || null,
          description: input.descriptionEn?.trim() || input.descriptionAr?.trim() || null,
          descriptionAr: input.descriptionAr?.trim() || null,
          descriptionEn: input.descriptionEn?.trim() || null,
          categoryId,
          tags: input.tags ?? [],
          price: input.price,
          compareAtPrice: input.compareAtPrice ?? null,
          quantity: input.quantity,
          minOrderQuantity: input.minOrderQuantity ?? 1,
          sku: input.sku?.trim() || null,
          images: input.images ?? [],
          status,
        },
        include: {
          category: { select: { id: true, name: true, nameAr: true, nameEn: true } },
        },
      })

      await writeAuditLog({
        request,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'PRODUCT_CREATED',
        entityType: 'PRODUCT',
        entityId: created.id,
        metadata: {
          supplierId: user.supplier.id,
        },
      })

      return NextResponse.json({ success: true, data: created, message: 'Product created' }, { status: 201 })
    }
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 })
  }
}


