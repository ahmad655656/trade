import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { Role } from '@/lib/prisma-enums'
import { sanitizePlainText } from '@/lib/sanitize'
import { assertSameOrigin } from '@/lib/security'

async function listMethods(supplierId: string) {
  return prisma.shippingMethod.findMany({
    where: { supplierId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const methods = await listMethods(user.supplier.id)
    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    console.error('Failed to load shipping methods:', error)
    return NextResponse.json({ success: false, error: 'Failed to load shipping methods' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = sanitizePlainText(body.name, 120)
    if (!name) {
      return NextResponse.json({ success: false, error: 'Shipping method name is required' }, { status: 400 })
    }

    const fee = Number(body.fee ?? 0)
    if (Number.isNaN(fee) || fee < 0) {
      return NextResponse.json({ success: false, error: 'Invalid fee' }, { status: 400 })
    }

    const estimatedDays = body.estimatedDays === null || body.estimatedDays === undefined || body.estimatedDays === ''
      ? null
      : Number(body.estimatedDays)
    if (estimatedDays !== null && Number.isNaN(estimatedDays)) {
      return NextResponse.json({ success: false, error: 'Invalid estimated days' }, { status: 400 })
    }

    await prisma.shippingMethod.create({
      data: {
        supplierId: user.supplier.id,
        name,
        description: body.description ? sanitizePlainText(body.description, 500) : null,
        fee,
        estimatedDays,
        isActive: body.isActive !== false,
      },
    })

    const methods = await listMethods(user.supplier.id)
    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    console.error('Failed to create shipping method:', error)
    return NextResponse.json({ success: false, error: 'Failed to create shipping method' }, { status: 500 })
  }
}
