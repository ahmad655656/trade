import { AddressType, Role } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { getSessionUser } from '@/lib/session'

type AddressPayload = {
  type?: AddressType
  title?: string
  recipient?: string
  phone?: string
  country?: string
  city?: string
  state?: string
  address?: string
  postalCode?: string
  latitude?: number | null
  longitude?: number | null
  isDefault?: boolean
}

function sanitize(body: AddressPayload) {
  return {
    type: body.type ?? AddressType.HOME,
    title: String(body.title ?? '').trim(),
    recipient: String(body.recipient ?? '').trim(),
    phone: String(body.phone ?? '').trim(),
    country: String(body.country ?? '').trim(),
    city: String(body.city ?? '').trim(),
    state: String(body.state ?? '').trim() || null,
    address: String(body.address ?? '').trim(),
    postalCode: String(body.postalCode ?? '').trim() || null,
    latitude: typeof body.latitude === 'number' ? body.latitude : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
    isDefault: Boolean(body.isDefault),
  }
}

export async function GET(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({ success: true, data: addresses })
  } catch (error) {
    console.error('Failed to list addresses:', error)
    return NextResponse.json({ success: false, error: 'Failed to list addresses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const body: AddressPayload = await request.json()
    const payload = sanitize(body)

    if (!payload.title || !payload.recipient || !payload.phone || !payload.country || !payload.city || !payload.address) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يرجى تعبئة جميع الحقول المطلوبة', 'Please fill all required fields') },
        { status: 400 },
      )
    }

    const count = await prisma.address.count({ where: { userId: user.id } })
    const shouldBeDefault = payload.isDefault || count === 0

    const created = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.address.create({
        data: {
          userId: user.id,
          type: payload.type,
          title: payload.title,
          recipient: payload.recipient,
          phone: payload.phone,
          country: payload.country,
          city: payload.city,
          state: payload.state,
          address: payload.address,
          postalCode: payload.postalCode,
          latitude: payload.latitude,
          longitude: payload.longitude,
          isDefault: shouldBeDefault,
        },
      })
    })

    return NextResponse.json(
      { success: true, data: created, message: i18nText(language, 'تمت إضافة العنوان بنجاح', 'Address added successfully') },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to create address:', error)
    return NextResponse.json({ success: false, error: 'Failed to create address' }, { status: 500 })
  }
}
