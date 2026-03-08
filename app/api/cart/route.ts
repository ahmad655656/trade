import { NextResponse } from 'next/server'
import { ProductStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { recalculateCartTotals } from '@/lib/cart'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cart = await prisma.cart.findUnique({
      where: { traderId: user.trader.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                supplier: { include: { user: { select: { id: true, name: true } } } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json({ success: true, data: cart })
  } catch (error) {
    console.error('Failed to load cart:', error)
    return NextResponse.json({ success: false, error: 'Failed to load cart' }, { status: 500 })
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
    const quantity = Math.max(1, Number(body.quantity ?? 1))

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product is required' }, { status: 400 })
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
      },
      select: { id: true, price: true, quantity: true },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product unavailable' }, { status: 404 })
    }

    if (product.quantity < quantity) {
      return NextResponse.json({ success: false, error: 'Insufficient stock' }, { status: 400 })
    }

    const cart = await prisma.cart.upsert({
      where: { traderId: user.trader.id },
      update: {},
      create: { traderId: user.trader.id },
      select: { id: true },
    })

    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: product.id },
      select: { id: true, quantity: true },
    })

    if (existing) {
      const newQuantity = existing.quantity + quantity
      if (newQuantity > product.quantity) {
        return NextResponse.json({ success: false, error: 'Quantity exceeds stock' }, { status: 400 })
      }

      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity, price: product.price },
      })
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity,
          price: product.price,
        },
      })
    }

    const totals = await recalculateCartTotals(cart.id)

    return NextResponse.json({ success: true, data: totals, message: 'Added to cart' }, { status: 201 })
  } catch (error) {
    console.error('Failed to add to cart:', error)
    return NextResponse.json({ success: false, error: 'Failed to add to cart' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cart = await prisma.cart.findUnique({
      where: { traderId: user.trader.id },
      select: { id: true },
    })

    if (!cart) {
      return NextResponse.json({ success: true, message: 'Cart already empty' })
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
    await recalculateCartTotals(cart.id)

    return NextResponse.json({ success: true, message: 'Cart cleared' })
  } catch (error) {
    console.error('Failed to clear cart:', error)
    return NextResponse.json({ success: false, error: 'Failed to clear cart' }, { status: 500 })
  }
}
