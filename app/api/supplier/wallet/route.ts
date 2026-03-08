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

    const [wallet, bankAccounts, withdrawals] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId: user.id },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
        },
      }),
      prisma.bankAccount.findMany({
        where: { supplierId: user.supplier.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.withdrawal.findMany({
        where: { supplierId: user.supplier.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        wallet: wallet ?? {
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          transactions: [],
        },
        bankAccounts,
        withdrawals,
      },
    })
  } catch (error) {
    console.error('Failed to load supplier wallet:', error)
    return NextResponse.json({ success: false, error: 'Failed to load supplier wallet' }, { status: 500 })
  }
}

