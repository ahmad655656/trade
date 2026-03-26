import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { SupplierVerificationStatus } from '@prisma/client'
import { isSchemaOutOfSyncError, SCHEMA_OUT_OF_SYNC_MESSAGE } from '@/lib/prisma-errors'

const TRADER_VERIFICATION_STATUSES = Object.values(SupplierVerificationStatus)

function isTraderVerificationStatus(value: string): value is SupplierVerificationStatus {
  return TRADER_VERIFICATION_STATUSES.includes(value as SupplierVerificationStatus)
}

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')?.trim()

    const traders = await prisma.trader.findMany({
      where: {
        ...(status && isTraderVerificationStatus(status) ? { verification: { is: { status } } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true } },
        verification: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ success: true, data: traders })
  } catch (error) {
    console.error('Failed to list traders for admin:', error)
    if (isSchemaOutOfSyncError(error)) {
      return NextResponse.json({ success: false, error: SCHEMA_OUT_OF_SYNC_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: 'Failed to list traders' }, { status: 500 })
  }
}
