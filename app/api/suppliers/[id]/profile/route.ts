import { NextResponse } from 'next/server'
import { ProductStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        verification: {
          include: { documents: true },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    const [products, closedOrderItems, allPaidOrderItems] = await Promise.all([
      prisma.product.findMany({
        where: {
          supplierId: supplier.id,
          status: ProductStatus.ACTIVE,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          name: true,
          nameAr: true,
          nameEn: true,
          price: true,
          compareAtPrice: true,
          quantity: true,
          soldCount: true,
          rating: true,
          reviewCount: true,
        },
      }),
      prisma.orderItem.findMany({
        where: {
          supplierId: supplier.id,
          order: {
            status: 'ORDER_CLOSED',
            paymentStatus: 'PAID',
          },
        },
        include: {
          order: {
            select: { shippedAt: true, deliveredAt: true },
          },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          supplierId: supplier.id,
          order: { paymentStatus: 'PAID' },
        },
        select: { orderId: true },
      }),
    ])

    const completedOrders = new Set(closedOrderItems.map((item) => item.orderId)).size
    const totalPaidOrders = new Set(allPaidOrderItems.map((item) => item.orderId)).size
    const completionRate = totalPaidOrders ? (completedOrders / totalPaidOrders) * 100 : 0

    const shippingDurations = closedOrderItems
      .map((item) => {
        const shippedAt = item.order.shippedAt?.getTime()
        const deliveredAt = item.order.deliveredAt?.getTime()
        if (!shippedAt || !deliveredAt || deliveredAt <= shippedAt) return null
        return (deliveredAt - shippedAt) / (1000 * 60 * 60 * 24)
      })
      .filter((value): value is number => value !== null)

    const averageShippingTimeDays = shippingDurations.length
      ? shippingDurations.reduce((sum, value) => sum + value, 0) / shippingDurations.length
      : 0

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          companyName: supplier.companyName,
          description: supplier.description,
          logo: supplier.logo,
          coverImage: supplier.coverImage,
          verified: supplier.verified,
          user: supplier.user,
          verificationStatus: supplier.verification?.status ?? 'PENDING',
        },
        metrics: {
          averageRating: supplier.rating,
          totalCompletedOrders: completedOrders,
          orderCompletionRate: Number(completionRate.toFixed(2)),
          averageShippingTimeDays: Number(averageShippingTimeDays.toFixed(2)),
          totalReviews: supplier.totalReviews,
        },
        products,
      },
    })
  } catch (error) {
    console.error('Failed to load supplier profile:', error)
    return NextResponse.json({ success: false, error: 'Failed to load supplier profile' }, { status: 500 })
  }
}
