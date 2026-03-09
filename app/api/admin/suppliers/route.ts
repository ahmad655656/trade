import { NextResponse } from 'next/server'
import { Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { SupplierVerificationStatus } from '@prisma/client'

const SUPPLIER_VERIFICATION_STATUSES = Object.values(SupplierVerificationStatus)

function isSupplierVerificationStatus(value: string): value is SupplierVerificationStatus {
  return SUPPLIER_VERIFICATION_STATUSES.includes(value as SupplierVerificationStatus)
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

    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(status && isSupplierVerificationStatus(status) ? { verification: { status } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        verification: {
          include: {
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ success: true, data: suppliers })
  } catch (error) {
    console.error('Failed to list suppliers for admin:', error)
    return NextResponse.json({ success: false, error: 'Failed to list suppliers' }, { status: 500 })
  }
}
