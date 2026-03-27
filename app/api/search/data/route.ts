import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { similarity } from '@/lib/search'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim()
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)
    const type = (searchParams.get('type') as 'products' | 'suppliers' | 'traders' | 'all' | null) ?? 'all'
    const categoryId = searchParams.get('categoryId') || undefined
    const language = searchParams.get('lang') as 'ar' | 'en' | null ?? 'ar'

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

    type SearchItem = {
      id: string
      type: 'product' | 'supplier' | 'trader'
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
    }

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [], query, total: 0 })
    }

    const qLower = query.toLowerCase()

    // Deduplication maps
    const uniqueItems: Map<string, SearchItem> = new Map()

    if (type === 'products' || type === 'all') {
      const products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          quantity: { gt: 0 },
          OR: [
            { nameAr: { contains: query, mode: 'insensitive' } },
            { nameEn: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { descriptionAr: { contains: query, mode: 'insensitive' } },
            { descriptionEn: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } },
          ],
          ...(categoryId && { categoryId }),
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit) * 2, // Fetch more for better scoring
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

      for (const p of products) {
        const fields = [
          (p.nameAr || '').toLowerCase(),
          (p.nameEn || '').toLowerCase(),
          (p.name || '').toLowerCase(),
          (p.descriptionAr || '').toLowerCase(),
          (p.descriptionEn || '').toLowerCase(),
          (p.description || '').toLowerCase(),
        ]
        let maxSim = 0
        for (const field of fields) {
          maxSim = Math.max(maxSim, similarity(qLower, field))
        }
        const score = Math.round(maxSim * 100)
        if (score >= 20) { // Minimum relevance
          const item = {
            id: p.id,
            type: 'product' as const,
            title: p.nameAr || p.nameEn || p.name || '',
            description: language === 'ar' 
              ? `${p.supplier?.companyName || ''} - ${p.category?.nameAr || p.category?.nameEn || ''}`.trim()
              : `${p.supplier?.companyName || ''} - ${p.category?.nameEn || p.category?.nameAr || ''}`.trim(),
            url: `/products/${p.id}`,
            price: p.price,
            image: p.images?.[0] || '',
            supplier: p.supplier,
            category: p.category,
            score,
            rating: p.supplier?.rating
          }
          if (!uniqueItems.has(p.id) || score > (uniqueItems.get(p.id)?.score || 0)) {
            uniqueItems.set(p.id, item)
          }
        }
      }
    }

    if (type === 'suppliers' || type === 'all') {
      const suppliers = await prisma.supplier.findMany({
        where: {
          verified: true,
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { user: { name: { contains: query, mode: 'insensitive' } } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { rating: 'desc' },
        take: Number(limit) * 2,
        include: {
          user: { select: { name: true } },
          _count: { select: { products: true, reviews: true } },
        },
      })

      for (const s of suppliers) {
        const fields = [
          (s.companyName || '').toLowerCase(),
          (s.user.name || '').toLowerCase(),
          (s.description || '').toLowerCase(),
        ]
        let maxSim = 0
        for (const field of fields) {
          maxSim = Math.max(maxSim, similarity(qLower, field))
        }
        const score = Math.round(maxSim * 100)
        if (score >= 20) {
          const verifiedBadge = s.verified ? (language === 'ar' ? '✅ موثق' : '✅ Verified') : ''
          const descParts = [
            s.user.name,
            verifiedBadge,
            `${language === 'ar' ? s._count.products : s._count.products} ${language === 'ar' ? 'منتج' : 'products'}`,
            `⭐ ${s.rating?.toFixed(1) || 0} (${s._count.reviews} ${language === 'ar' ? 'تقييم' : 'reviews'})`,
          ].filter(Boolean)
          const item = {
            id: s.id,
            type: 'supplier' as const,
            title: s.companyName,
            description: descParts.join(' - '),
            url: `/suppliers/${s.id}`,
            rating: s.rating,
            productCount: s._count.products,
            score,
          }
          if (!uniqueItems.has(s.id) || score > (uniqueItems.get(s.id)?.score || 0)) {
            uniqueItems.set(s.id, item)
          }
        }
      }
    }

    if (type === 'traders' || type === 'all') {
      const traders = await prisma.trader.findMany({
        where: {
          user: { status: 'ACTIVE' },
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { user: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit) * 2,
        include: {
          user: { select: { name: true } },
        },
      })

      for (const t of traders) {
        const fields = [
          (t.companyName || '').toLowerCase(),
          (t.user.name || '').toLowerCase(),
        ]
        let maxSim = 0
        for (const field of fields) {
          maxSim = Math.max(maxSim, similarity(qLower, field))
        }
        const score = Math.round(maxSim * 100)
        if (score >= 20) {
          const title = t.companyName || t.user.name || ''
          const descParts = [
            title !== t.companyName ? t.companyName : '',
            t.businessType ? (language === 'ar' ? t.businessType : t.businessType) : '',
          ].filter(Boolean)
          const item = {
            id: t.id,
            type: 'trader' as const,
            title,
            description: descParts.join(' - ') || `${language === 'ar' ? 'تاجر نشط' : 'Active trader'}`,
            url: `/traders/${t.id}`,
            score,
          }
          if (!uniqueItems.has(t.id) || score > (uniqueItems.get(t.id)?.score || 0)) {
            uniqueItems.set(t.id, item)
          }
        }
      }
    }

    const sortedItems = Array.from(uniqueItems.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Number(limit))

    console.log(`Search "${query}": found ${sortedItems.length} unique results (type: ${type}, lang: ${language})`)

    return NextResponse.json({ 
      success: true, 
      data: sortedItems, 
      query, 
      total: sortedItems.length 
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ success: false, error: 'Search failed', data: [] }, { status: 500 })
  }
}


