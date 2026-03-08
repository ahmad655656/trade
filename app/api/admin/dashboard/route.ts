import { Role } from '@/lib/prisma-enums'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [usersCount, verifiedSuppliers, pendingPayments, todayPaid] = await Promise.all([
      prisma.user.count(),
      prisma.supplier.count({ where: { verified: true } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: startOfDay },
        },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        usersCount,
        verifiedSuppliers,
        pendingPayments,
        todayVolume: todayPaid._sum.amount ?? 0,
      },
    })
  } catch (error) {
    console.error('Failed to load admin dashboard:', error)
    return NextResponse.json({ success: false, error: 'Failed to load admin dashboard' }, { status: 500 })
  }
}

