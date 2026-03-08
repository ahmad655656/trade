import { AddressType, Role } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestLanguage, i18nText } from '@/lib/request-language'
import { getSessionUser } from '@/lib/session'

type Params = { params: Promise<{ id: string }> }

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

export async function GET(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const address = await prisma.address.findFirst({
      where: { id, userId: user.id },
    })

    if (!address) {
      return NextResponse.json({ success: false, error: i18nText(language, 'العنوان غير موجود', 'Address not found') }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: address })
  } catch (error) {
    console.error('Failed to get address:', error)
    return NextResponse.json({ success: false, error: 'Failed to get address' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.address.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: i18nText(language, 'العنوان غير موجود', 'Address not found') }, { status: 404 })
    }

    const body: AddressPayload = await request.json()
    const payload = sanitize(body)

    if (!payload.title || !payload.recipient || !payload.phone || !payload.country || !payload.city || !payload.address) {
      return NextResponse.json(
        { success: false, error: i18nText(language, 'يرجى تعبئة جميع الحقول المطلوبة', 'Please fill all required fields') },
        { status: 400 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        })
      }

      return tx.address.update({
        where: { id },
        data: {
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
          isDefault: payload.isDefault || existing.isDefault,
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: i18nText(language, 'تم تحديث العنوان بنجاح', 'Address updated successfully'),
    })
  } catch (error) {
    console.error('Failed to update address:', error)
    return NextResponse.json({ success: false, error: 'Failed to update address' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.address.findFirst({ where: { id, userId: user.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: i18nText(language, 'العنوان غير موجود', 'Address not found') }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } })

      if (existing.isDefault) {
        const fallback = await tx.address.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        })
        if (fallback) {
          await tx.address.update({ where: { id: fallback.id }, data: { isDefault: true } })
        }
      }
    })

    return NextResponse.json({ success: true, message: i18nText(language, 'تم حذف العنوان', 'Address deleted') })
  } catch (error) {
    console.error('Failed to delete address:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete address' }, { status: 500 })
  }
}
