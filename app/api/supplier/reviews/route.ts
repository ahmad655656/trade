import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const reviews = await prisma.review.findMany({
      where: { toSupplierId: user.supplier.id },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, name: true } },
        toProduct: { select: { id: true, nameAr: true, nameEn: true } },
      },
    })

    return NextResponse.json({ success: true, data: reviews })
  } catch (error) {
    console.error('Failed to load supplier reviews:', error)
    return NextResponse.json({ success: false, error: 'Failed to load supplier reviews' }, { status: 500 })
  }
}

