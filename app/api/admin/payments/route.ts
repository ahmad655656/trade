import { Role } from '@/lib/prisma-enums'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { getSessionUser } from '@/lib/session'

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

const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const
type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number]

function isPaymentStatus(value: string): value is PaymentStatusValue {
  return PAYMENT_STATUSES.includes(value as PaymentStatusValue)
}

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const statusParam = searchParams.get('status')?.trim()
    const from = searchParams.get('from')?.trim()
    const to = searchParams.get('to')?.trim()
    const minAmount = Number(searchParams.get('minAmount') ?? '')
    const maxAmount = Number(searchParams.get('maxAmount') ?? '')
    const hasReceipt = searchParams.get('hasReceipt') === '1'

    const payments = await prisma.payment.findMany({
      where: {
        ...(statusParam && isPaymentStatus(statusParam) ? { status: statusParam } : {}),
        ...(Number.isFinite(minAmount) ? { amount: { gte: minAmount } } : {}),
        ...(Number.isFinite(maxAmount) ? { amount: { lte: maxAmount } } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { transactionId: { contains: search, mode: 'insensitive' } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                { order: { trader: { user: { name: { contains: search, mode: 'insensitive' } } } } },
              ],
            }
          : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            trader: { select: { user: { select: { id: true, name: true, email: true } } } },
            items: {
              select: {
                supplier: { select: { user: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const mapped = payments
      .map((payment: any) => {
        const manual = parseManualPayload(payment.refundReason)
        if (hasReceipt && !manual?.receiptUrl) return null
        return {
          ...payment,
          manualPayment: manual,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Failed to list payments:', error)
    return NextResponse.json({ success: false, error: 'Failed to list payments' }, { status: 500 })
  }
}

