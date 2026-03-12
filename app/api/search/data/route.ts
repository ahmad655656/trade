import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)
    const type = searchParams.get('type') as 'products' | 'suppliers' | 'all' | null ?? 'all'
    const categoryId = searchParams.get('categoryId') || undefined

    type SupplierSummary = {
      id: string
      companyName: string
      logo: string | null
      verified: boolean
      rating: number
    }

    type CategorySummary = {
      nameAr: string | null
      nameEn: string | null
    }

    const items: Array<{
      id: string
      type: 'product' | 'supplier'
      title: string
      description: string
      url: string
      score: number
      price?: number
      image?: string
      supplier?: SupplierSummary | null
      category?: CategorySummary | null
      rating?: number
      productCount?: number
    }> = []

    if (!q || q.length < 2) {
      // If no meaningful query, return empty
      return NextResponse.json({ success: true, data: [], query: q, total: 0 })
    }

    if (type === 'products' || type === 'all') {
      const products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          quantity: { gt: 0 },
          OR: [
            { nameAr: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { descriptionAr: { contains: q, mode: 'insensitive' } },
            { descriptionEn: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { tags: { has: q } },
          ],
          ...(categoryId && { categoryId }),
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        select: {
          id: true,
          name: true,
          nameAr: true,
          nameEn: true,
          description: true,
          descriptionAr: true,
          descriptionEn: true,
          price: true,
          images: true,
          supplier: {
            select: {
              id: true,
              companyName: true,
              logo: true,
              verified: true,
              rating: true,
            },
          },
          category: {
            select: { nameAr: true, nameEn: true },
          },
        },
      })
      
      const productItems = products.map(p => {
        let score = 0
        const fields = [p.nameAr, p.nameEn, p.name, p.descriptionAr, p.descriptionEn, p.description]
        for (const field of fields) {
          if (field?.toLowerCase().includes(q)) {
            score += field.toLowerCase() === q ? 3 : (p.nameAr?.toLowerCase().includes(q) || p.nameEn?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)) ? 2 : 1
          }
        }
        return {
          id: p.id,
          type: 'product' as const,
          title: p.nameAr || p.nameEn || p.name,
          description: [p.descriptionAr, p.descriptionEn, p.description, p.supplier.companyName, p.category?.nameAr || p.category?.nameEn].filter(Boolean).join(' - '),
          url: `/products/${p.id}`,
          price: p.price,
          image: p.images[0],
          supplier: p.supplier,
          category: p.category,
          score: Math.min(score * 10, 100)
        }
      })
      items.push(...productItems)
    }

    if (type === 'suppliers' || type === 'all') {
      const suppliers = await prisma.supplier.findMany({
        where: {
          verified: true,
          OR: [
            { companyName: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { rating: 'desc' },
        take: Number(limit),
        include: {
          user: { select: { name: true } },
          _count: { select: { products: true, reviews: true } },
        },
      })
      
      const supplierItems = suppliers.map(s => {
        let score = 0
        const fields = [s.companyName, s.user.name, s.description]
        for (const field of fields) {
          if (field?.toLowerCase().includes(q)) {
            score += field.toLowerCase() === q ? 3 : 2
          }
        }
        return {
          id: s.id,
          type: 'supplier' as const,
          title: s.companyName,
          description: [s.user.name, `المنتجات: ${s._count.products}`, `التقييمات: ${s._count.reviews}`].filter(Boolean).join(' - '),
          url: `/suppliers/${s.id}`,
          rating: s.rating,
          productCount: s._count.products,
          score: Math.min(score * 10, 100)
        }
      })
      items.push(...supplierItems)
    }

    // Sort by score desc
    const sortedItems = items.sort((a, b) => b.score - a.score).slice(0, Number(limit))

    console.log(`Search "${q}": found ${sortedItems.length} results (type: ${type})`)

    return NextResponse.json({ 
      success: true, 
      data: sortedItems, 
      query: q, 
      total: sortedItems.length 
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ success: false, error: 'Search failed', data: [] }, { status: 500 })
  }
}

