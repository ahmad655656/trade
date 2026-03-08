import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const wishlist = await prisma.wishlistItem.findMany({
      where: { traderId: user.trader.id },
      include: {
        product: {
          include: {
            supplier: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: wishlist })
  } catch (error) {
    console.error('Failed to fetch wishlist:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch wishlist' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const productId = String(body.productId ?? '')
    if (!productId) return NextResponse.json({ success: false, error: 'Product is required' }, { status: 400 })

    const created = await prisma.wishlistItem.upsert({
      where: {
        traderId_productId: {
          traderId: user.trader.id,
          productId,
        },
      },
      update: {},
      create: {
        traderId: user.trader.id,
        productId,
      },
    })

    return NextResponse.json({ success: true, data: created, message: 'Added to wishlist' }, { status: 201 })
  } catch (error) {
    console.error('Failed to add wishlist:', error)
    return NextResponse.json({ success: false, error: 'Failed to add wishlist' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    if (!productId) return NextResponse.json({ success: false, error: 'Product is required' }, { status: 400 })

    await prisma.wishlistItem.deleteMany({
      where: {
        traderId: user.trader.id,
        productId,
      },
    })

    return NextResponse.json({ success: true, message: 'Removed from wishlist' })
  } catch (error) {
    console.error('Failed to remove wishlist:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove wishlist' }, { status: 500 })
  }
}
