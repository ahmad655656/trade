import { prisma } from '@/lib/prisma'

export async function recalculateCartTotals(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    select: { quantity: true, price: true },
  })

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = Number(items.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2))

  await prisma.cart.update({
    where: { id: cartId },
    data: { totalItems, totalAmount },
  })

  return { totalItems, totalAmount }
}
