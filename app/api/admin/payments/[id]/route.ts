import { Role } from '@/lib/prisma-enums'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { getSessionUser } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

function parseManualPayload(raw: string | null) {
  if (!raw) return null
  try {
    return JSON.parse(raw) as {
      senderPhone?: string
      transferTo?: string
      receiptUrl?: string
      notes?: string | null
      submittedAt?: string
    }
  } catch {
    return null
  }
}

export async function GET(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            trader: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
            address: true,
            items: {
              include: {
                product: { select: { id: true, name: true, nameAr: true, nameEn: true } },
                supplier: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ success: false, error: i18nText(language, 'الدفع غير موجود', 'Payment not found') }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...payment,
        manualPayment: parseManualPayload(payment.refundReason),
      },
    })
  } catch (error) {
    console.error('Failed to get payment details:', error)
    return NextResponse.json({ success: false, error: 'Failed to get payment details' }, { status: 500 })
  }
}

