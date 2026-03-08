import { PaymentStatus, Role } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supplierId = user.supplier.id
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 29)
    const prevThirtyStart = new Date(now)
    prevThirtyStart.setDate(now.getDate() - 59)
    const prevThirtyEnd = new Date(now)
    prevThirtyEnd.setDate(now.getDate() - 30)

    const [orderItems, recentOrderItems, previousPeriodOrderItems, products, reviews, latestOrders] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          supplierId,
          order: { paymentStatus: PaymentStatus.PAID },
        },
        include: {
          order: { select: { id: true, orderNumber: true, createdAt: true, status: true, trader: { include: { user: { select: { name: true } } } } } },
          product: { select: { id: true, nameAr: true, nameEn: true, category: { select: { id: true, nameAr: true, nameEn: true, name: true } } } },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          supplierId,
          order: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: thirtyDaysAgo } },
        },
        select: { total: true },
      }),
      prisma.orderItem.findMany({
        where: {
          supplierId,
          order: { paymentStatus: PaymentStatus.PAID, createdAt: { gte: prevThirtyStart, lte: prevThirtyEnd } },
        },
        select: { total: true },
      }),
      prisma.product.findMany({
        where: { supplierId },
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          quantity: true,
          views: true,
          soldCount: true,
          rating: true,
          reviewCount: true,
          category: { select: { id: true, nameAr: true, nameEn: true, name: true } },
        },
      }),
      prisma.review.findMany({
        where: { toSupplierId: supplierId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          fromUser: { select: { id: true, name: true } },
          toProduct: { select: { id: true, nameAr: true, nameEn: true } },
        },
      }),
      prisma.order.findMany({
        where: {
          items: { some: { supplierId } },
          paymentStatus: PaymentStatus.PAID,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          items: {
            where: { supplierId },
            include: { product: { select: { nameAr: true, nameEn: true } } },
          },
        },
      }),
    ])

    const totalSales = orderItems.reduce((sum, item) => sum + item.total, 0)
    const ordersCount = new Set(orderItems.map((item) => item.order.id)).size
    const averageOrderValue = ordersCount ? totalSales / ordersCount : 0

    const recentSales = recentOrderItems.reduce((sum, item) => sum + item.total, 0)
    const previousSales = previousPeriodOrderItems.reduce((sum, item) => sum + item.total, 0)
    const growthRate = previousSales > 0 ? ((recentSales - previousSales) / previousSales) * 100 : recentSales > 0 ? 100 : 0

    const salesByDayMap = new Map<string, number>()
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      salesByDayMap.set(dayKey(d), 0)
    }
    for (const item of orderItems) {
      if (item.order.createdAt >= sevenDaysAgo) {
        const key = dayKey(item.order.createdAt)
        salesByDayMap.set(key, (salesByDayMap.get(key) ?? 0) + item.total)
      }
    }
    const salesLast7Days = Array.from(salesByDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ label: date.slice(5), value: Math.round(value) }))

    const statusMap = new Map<string, number>()
    for (const item of orderItems) {
      const status = item.order.status
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1)
    }
    const orderStatusBreakdown = Array.from(statusMap.entries()).map(([label, value]) => ({ label, value }))

    const categoryMap = new Map<string, number>()
    for (const item of orderItems) {
      const categoryName = item.product.category?.nameAr || item.product.category?.nameEn || item.product.category?.name || 'General'
      categoryMap.set(categoryName, (categoryMap.get(categoryName) ?? 0) + item.total)
    }
    const categorySales = Array.from(categoryMap.entries())
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const productSalesMap = new Map<string, { label: string; value: number }>()
    for (const item of orderItems) {
      const key = item.product.id
      const label = item.product.nameAr || item.product.nameEn || 'Product'
      const prev = productSalesMap.get(key)
      if (prev) prev.value += item.quantity
      else productSalesMap.set(key, { label, value: item.quantity })
    }
    const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.value - a.value).slice(0, 10)
    const leastSelling = Array.from(productSalesMap.values()).sort((a, b) => a.value - b.value).slice(0, 10)

    const trendingViewed = [...products]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map((p) => ({ label: p.nameAr || p.nameEn || 'Product', value: p.views }))

    const lowStockCritical = products
      .filter((p) => p.quantity < 5)
      .map((p) => ({ id: p.id, nameAr: p.nameAr || p.nameEn || 'منتج', nameEn: p.nameEn || p.nameAr || 'Product', stock: p.quantity }))

    const latestReviews = reviews.map((r) => ({
      id: r.id,
      reviewerName: r.fromUser.name,
      productName: r.toProduct?.nameAr || r.toProduct?.nameEn || '-',
      rating: r.rating,
      comment: r.comment || '',
      replied: Boolean(r.reply),
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalSales,
          ordersCount,
          averageOrderValue,
          growthRate,
          activeProducts: products.filter((p) => p.quantity > 0).length,
          lowStockCount: products.filter((p) => p.quantity > 0 && p.quantity <= 5).length,
          averageRating: products.length ? products.reduce((sum, p) => sum + p.rating, 0) / products.length : 0,
        },
        salesLast7Days,
        orderStatusBreakdown,
        categorySales,
        topProducts,
        leastSelling,
        trendingViewed,
        lowStockCritical,
        latestReviews,
        latestOrders: latestOrders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt.toISOString(),
          status: order.status,
          totalAmount: order.totalAmount,
          productName: order.items[0]?.product.nameAr || order.items[0]?.product.nameEn || '-',
          quantity: order.items.reduce((sum, it) => sum + it.quantity, 0),
          unitPrice: order.items[0]?.price || 0,
        })),
      },
    })
  } catch (error) {
    console.error('Failed to load supplier analytics:', error)
    return NextResponse.json({ success: false, error: 'Failed to load supplier analytics' }, { status: 500 })
  }
}

