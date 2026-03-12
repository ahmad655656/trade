import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { Role } from '@/lib/prisma-enums'
import { sanitizePlainText } from '@/lib/sanitize'
import { assertSameOrigin } from '@/lib/security'

const BUSINESS_TYPES = ['RETAIL', 'WHOLESALE', 'MANUFACTURER', 'DISTRIBUTOR', 'SERVICE_PROVIDER'] as const

type BusinessType = (typeof BUSINESS_TYPES)[number]

function isBusinessType(value: unknown): value is BusinessType {
  return BUSINESS_TYPES.includes(value as BusinessType)
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== Role.SUPPLIER || !user.supplier) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: user.supplier.id },
      select: {
        id: true,
        companyName: true,
        description: true,
        businessType: true,
        commercialRegister: true,
        taxNumber: true,
        logo: true,
        coverImage: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    })

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Failed to load supplier profile:', error)
    return NextResponse.json({ success: false, error: 'Failed to load supplier profile' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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
    const supplierUpdate: {
      companyName?: string
      description?: string | null
      businessType?: BusinessType | null
      commercialRegister?: string | null
      taxNumber?: string | null
      logo?: string | null
      coverImage?: string | null
    } = {}

    if (typeof body.companyName === 'string') {
      const companyName = sanitizePlainText(body.companyName, 120)
      if (!companyName) {
        return NextResponse.json({ success: false, error: 'Store name is required' }, { status: 400 })
      }
      supplierUpdate.companyName = companyName
    }
    if (body.description !== undefined) {
      supplierUpdate.description = body.description ? sanitizePlainText(body.description, 2000) : null
    }
    if (body.businessType === null || body.businessType === undefined) {
      supplierUpdate.businessType = null
    } else if (isBusinessType(body.businessType)) {
      supplierUpdate.businessType = body.businessType
    }
    if (body.commercialRegister !== undefined) {
      supplierUpdate.commercialRegister = body.commercialRegister
        ? sanitizePlainText(body.commercialRegister, 120)
        : null
    }
    if (body.taxNumber !== undefined) {
      supplierUpdate.taxNumber = body.taxNumber ? sanitizePlainText(body.taxNumber, 120) : null
    }
    if (body.logo !== undefined) {
      supplierUpdate.logo = body.logo ? sanitizePlainText(body.logo, 512) : null
    }
    if (body.coverImage !== undefined) {
      supplierUpdate.coverImage = body.coverImage ? sanitizePlainText(body.coverImage, 512) : null
    }

    const userUpdate: { name?: string; phone?: string | null } = {}
    if (typeof body.name === 'string') {
      userUpdate.name = sanitizePlainText(body.name, 120)
    }
    if (body.phone !== undefined) {
      userUpdate.phone = body.phone ? sanitizePlainText(body.phone, 40) : null
    }

    if (Object.keys(userUpdate).length) {
      await prisma.user.update({ where: { id: user.id }, data: userUpdate })
    }

    const supplier = Object.keys(supplierUpdate).length
      ? await prisma.supplier.update({
          where: { id: user.supplier.id },
          data: supplierUpdate,
          select: {
            id: true,
            companyName: true,
            description: true,
            businessType: true,
            commercialRegister: true,
            taxNumber: true,
            logo: true,
            coverImage: true,
            user: { select: { name: true, email: true, phone: true } },
          },
        })
      : await prisma.supplier.findUnique({
          where: { id: user.supplier.id },
          select: {
            id: true,
            companyName: true,
            description: true,
            businessType: true,
            commercialRegister: true,
            taxNumber: true,
            logo: true,
            coverImage: true,
            user: { select: { name: true, email: true, phone: true } },
          },
        })

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: supplier })
  } catch (error) {
    console.error('Failed to update supplier profile:', error)
    return NextResponse.json({ success: false, error: 'Failed to update supplier profile' }, { status: 500 })
  }
}
