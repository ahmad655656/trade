import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { recalculateCartTotals } from '@/lib/cart'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const quantity = Math.max(1, Number(body.quantity ?? 1))

    const item = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: { select: { quantity: true } },
      },
    })

    if (!item || item.cart.traderId !== user.trader.id) {
      return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 })
    }

    if (quantity > item.product.quantity) {
      return NextResponse.json({ success: false, error: 'Quantity exceeds stock' }, { status: 400 })
    }

    await prisma.cartItem.update({ where: { id }, data: { quantity } })
    const totals = await recalculateCartTotals(item.cartId)

    return NextResponse.json({ success: true, data: totals, message: 'Cart item updated' })
  } catch (error) {
    console.error('Failed to update cart item:', error)
    return NextResponse.json({ success: false, error: 'Failed to update cart item' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const item = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    })

    if (!item || item.cart.traderId !== user.trader.id) {
      return NextResponse.json({ success: false, error: 'Cart item not found' }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id } })
    const totals = await recalculateCartTotals(item.cartId)

    return NextResponse.json({ success: true, data: totals, message: 'Item removed' })
  } catch (error) {
    console.error('Failed to remove cart item:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove cart item' }, { status: 500 })
  }
}

