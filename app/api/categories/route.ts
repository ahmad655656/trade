import { NextResponse } from 'next/server'
import { ensureDefaultCategories } from '@/lib/default-categories'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await ensureDefaultCategories()

    const categories = await prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { nameAr: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        nameAr: true,
        nameEn: true,
        parentId: true,
      },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 })
  }
}
