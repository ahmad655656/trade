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

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const id = context.params.id
    const existing = await prisma.shippingMethod.findFirst({
      where: { id, supplierId: user.supplier.id },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shipping method not found' }, { status: 404 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? sanitizePlainText(body.name, 120) : existing.name
    if (!name) {
      return NextResponse.json({ success: false, error: 'Shipping method name is required' }, { status: 400 })
    }

    const fee = body.fee === undefined ? existing.fee : Number(body.fee)
    if (Number.isNaN(fee) || fee < 0) {
      return NextResponse.json({ success: false, error: 'Invalid fee' }, { status: 400 })
    }

    const estimatedDays =
      body.estimatedDays === undefined || body.estimatedDays === '' || body.estimatedDays === null
        ? null
        : Number(body.estimatedDays)
    if (estimatedDays !== null && Number.isNaN(estimatedDays)) {
      return NextResponse.json({ success: false, error: 'Invalid estimated days' }, { status: 400 })
    }

    await prisma.shippingMethod.update({
      where: { id },
      data: {
        name,
        description: body.description !== undefined ? (body.description ? sanitizePlainText(body.description, 500) : null) : existing.description,
        fee,
        estimatedDays,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    const methods = await listMethods(user.supplier.id)
    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    console.error('Failed to update shipping method:', error)
    return NextResponse.json({ success: false, error: 'Failed to update shipping method' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const id = context.params.id
    const existing = await prisma.shippingMethod.findFirst({
      where: { id, supplierId: user.supplier.id },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Shipping method not found' }, { status: 404 })
    }

    await prisma.shippingMethod.delete({ where: { id } })
    const methods = await listMethods(user.supplier.id)
    return NextResponse.json({ success: true, data: methods })
  } catch (error) {
    console.error('Failed to delete shipping method:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete shipping method' }, { status: 500 })
  }
}
