import { NextResponse } from 'next/server'
import { ProductStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { similarity } from '@/lib/search'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    if (!q) return NextResponse.json({ success: true, data: [] })

    const candidates = await prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      take: 120,
      select: {
        name: true,
        nameAr: true,
        nameEn: true,
        category: { select: { name: true, nameAr: true, nameEn: true } },
        supplier: { select: { companyName: true } },
      },
    })

    const flatSuggestions = candidates.flatMap((item) => [
      item.name,
      item.nameAr || '',
      item.nameEn || '',
      item.category.name,
      item.category.nameAr || '',
      item.category.nameEn || '',
      item.supplier.companyName,
    ])

    const unique = Array.from(
      new Set(
        flatSuggestions
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    )

    const ranked = unique
      .map((value) => ({
        value,
        score: Math.max(similarity(q, value.toLowerCase()), value.toLowerCase().includes(q) ? 1 : 0),
      }))
      .filter((entry) => entry.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => entry.value)

    return NextResponse.json({ success: true, data: ranked })
  } catch (error) {
    console.error('Failed to build search suggestions:', error)
    return NextResponse.json({ success: false, error: 'Failed to build suggestions' }, { status: 500 })
  }
}

