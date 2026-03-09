import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { PaymentMethod, ProductStatus, Role } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { notifyAdmins, notifyUsers } from '@/lib/notifications'
import { getSessionUser } from '@/lib/session'
import { getRequestLanguage, i18nText } from '@/lib/request-language'

type CreateOrderPayload = {
  productId: string
  quantity: number
  note?: string
}

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role === Role.TRADER && user.trader) {
      const orders = await prisma.order.findMany({
        where: { traderId: user.trader.id },
        orderBy: { createdAt: 'desc' },
        include: {
          payment: true,
          items: {
            include: {
              product: { select: { id: true, name: true, nameAr: true, nameEn: true } },
              supplier: { include: { user: { select: { id: true, name: true } } } },
            },
          },
        },
      })
      return NextResponse.json({ success: true, data: orders })
    }

    if (user.role === Role.SUPPLIER && user.supplier) {
      const orders = await prisma.order.findMany({
        where: {
          items: { some: { supplierId: user.supplier.id } },
          paymentStatus: 'PAID',
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          trader: { include: { user: { select: { id: true, name: true, email: true } } } },
          items: {
            where: { supplierId: user.supplier.id },
            include: {
              product: { select: { id: true, name: true, nameAr: true, nameEn: true } },
            },
          },
        },
      })
      return NextResponse.json({ success: true, data: orders })
    }

    if (user.role === Role.ADMIN) {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          trader: { include: { user: { select: { id: true, name: true, email: true } } } },
          items: {
            include: {
              product: { select: { id: true, name: true, nameAr: true, nameEn: true } },
              supplier: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          payment: true,
        },
      })
      return NextResponse.json({ success: true, data: orders })
    }

    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    console.error('Failed to fetch orders:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const language = getRequestLanguage(request)
    const user = await getSessionUser()
    if (!user || user.role !== Role.TRADER || !user.trader) {
      return NextResponse.json({ success: false, error: i18nText(language, 'غير مصرح', 'Unauthorized') }, { status: 401 })
    }

    const body: CreateOrderPayload = await request.json()
    if (!body.productId || !body.quantity || body.quantity < 1) {
      return NextResponse.json({ success: false, error: i18nText(language, 'بيانات الطلب غير صحيحة', 'Invalid order payload') }, { status: 400 })
    }

    const product = await prisma.product.findFirst({
      where: {
        id: body.productId,
        status: ProductStatus.ACTIVE,
        quantity: { gte: body.quantity },
      },
      include: {
        supplier: { include: { user: { select: { id: true } } } },
      },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: i18nText(language, 'المنتج غير متاح أو غير متوفر بالمخزون', 'Product unavailable or out of stock') }, { status: 400 })
    }

    const subtotal = Number((product.price * body.quantity).toFixed(2))
    const shipping = 0
    const tax = 0
    const discount = 0
    const totalAmount = subtotal + shipping + tax - discount
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          traderId: user.trader!.id,
          totalAmount,
          subtotal,
          tax,
          shipping,
          discount,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          shippingStatus: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          items: {
            create: [
              {
                productId: product.id,
                supplierId: product.supplierId,
                quantity: body.quantity,
                price: product.price,
                total: subtotal,
                commission: 0,
                status: 'PENDING',
              },
            ],
          },
          payment: {
            create: {
              amount: totalAmount,
              platformFee: 0,
              supplierAmount: totalAmount,
              status: 'PENDING',
              method: PaymentMethod.BANK_TRANSFER,
            },
          },
        },
        include: {
          items: true,
        },
      })

      await tx.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: body.quantity }, soldCount: { increment: body.quantity } },
      })

      return order
    })

    await notifyAdmins({
      type: 'ORDER_CREATED',
      title: i18nText(language, 'يتطلب تحقق دفع يدوي', 'Manual payment verification required'),
      message: i18nText(
        language,
        `تم إنشاء الطلب ${created.orderNumber} ويحتاج مراجعة دفع يدوي (سيرياتيل كاش).`,
        `Order ${created.orderNumber} placed and awaiting manual payment check (Syratel Cash).`,
      ),
      data: { orderId: created.id, orderNumber: created.orderNumber },
    })

    await notifyUsers({
      userIds: [user.id, product.supplier.user.id],
      type: 'SYSTEM',
      title: i18nText(language, 'تم إنشاء طلب جديد', 'New order created'),
      message: i18nText(
        language,
        `تم إنشاء الطلب ${created.orderNumber} وإرساله للأدمن للتحقق اليدوي من الدفع.`,
        `Order ${created.orderNumber} created and sent to admin for manual payment verification.`,
      ),
      data: { orderId: created.id, orderNumber: created.orderNumber },
    })

    return NextResponse.json(
      { success: true, data: created, message: i18nText(language, 'تم إنشاء الطلب وإرساله للأدمن للتحقق من الدفع', 'Order created and sent for admin payment verification') },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to create order:', error)
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 })
  }
}


