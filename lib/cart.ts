import { prisma } from '@/lib/prisma'

type CartTotalsItem = {
  quantity: number
  price: number
}

export async function recalculateCartTotals(cartId: string) {
  const items: CartTotalsItem[] = await prisma.cartItem.findMany({
    where: { cartId },
    select: { quantity: true, price: true },
  })

  const totalItems = items.reduce((sum: number, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum: number, item) => sum + item.quantity * item.price, 0)
  const totalAmount = Number(subtotal.toFixed(2))

  await prisma.cart.update({
    where: { id: cartId },
    data: { totalItems, totalAmount },
  })

  return { totalItems, totalAmount }
}
