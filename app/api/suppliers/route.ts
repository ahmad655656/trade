import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const verifiedOnly = searchParams.get('verifiedOnly') === '1'
    const sort = searchParams.get('sort') ?? 'newest'
    const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '12'), 1), 50)

    // Get actual product counts for all suppliers
    const productCounts = await prisma.product.groupBy({
      by: ['supplierId'],
      _count: { id: true },
    })

    const productCountMap = new Map(productCounts.map(pc => [pc.supplierId, pc._count.id]))

    // Build where clause
    const where: Parameters<typeof prisma.supplier.findMany>[0]['where'] = {}

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (verifiedOnly) {
      where.verified = true
    }

    let orderBy: Parameters<typeof prisma.supplier.findMany>[0]['orderBy'] = {
      createdAt: 'desc',
    }

    if (sort === 'rating') {
      orderBy = { rating: 'desc' }
    } else if (sort === 'products') {
      orderBy = { totalProducts: 'desc' }
    } else if (sort === 'name') {
      orderBy = { companyName: 'asc' }
    }

    const skip = (page - 1) * limit

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          companyName: true,
          logo: true,
          verified: true,
          rating: true,
          totalProducts: true,
          totalReviews: true,
          totalSales: true,
          createdAt: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ])

    // Replace totalProducts with actual count from products table
    const suppliersWithActualCounts = suppliers.map(supplier => ({
      ...supplier,
      totalProducts: productCountMap.get(supplier.id) ?? 0,
    }))

    return NextResponse.json({
      success: true,
      data: {
        suppliers: suppliersWithActualCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch suppliers:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

