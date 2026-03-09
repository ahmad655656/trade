import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where = {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    }

    const [orders, totals] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          platformFee: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          trader: { select: { user: { select: { id: true, name: true } } } },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paidAt: true,
              purpose: true,
            },
          },
        },
        take: 500,
      }),
      prisma.order.aggregate({
        where,
        _sum: {
          totalAmount: true,
          platformFee: true,
        },
      }),
    ])

    const pendingCommissions = orders
      .filter((order) => order.paymentStatus === 'PENDING')
      .reduce((sum, order) => sum + order.platformFee, 0)
    const completedPayments = orders.filter((order) => order.paymentStatus === 'PAID').length

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          totalOrderValue: totals._sum.totalAmount ?? 0,
          totalPlatformFee: totals._sum.platformFee ?? 0,
          pendingCommissions,
          completedPayments,
        },
        orders,
      },
    })
  } catch (error) {
    console.error('Failed to load commissions:', error)
    return NextResponse.json({ success: false, error: 'Failed to load commissions' }, { status: 500 })
  }
}

