import { NextResponse } from 'next/server'
import { NotificationType, Role, UserStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validation'
import { sanitizePlainText } from '@/lib/sanitize'
import { assertSameOrigin, getClientIp, getUserAgent, registerSecurityEvent } from '@/lib/security'
import { detectDuplicateAccountSignals } from '@/lib/fraud'
import { writeAuditLog } from '@/lib/audit'
import { notifyAdmins } from '@/lib/notifications'
import { getRequestLanguage, i18nText } from '@/lib/request-language'


type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

export async function POST(request: Request) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const language = getRequestLanguage(request)

    const body = await request.json()
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues[0]?.message ?? 'Invalid registration data',
        },
        { status: 400 },
      )
    }

    const { email, password, name, role, phone, companyName, commercialRegister, taxNumber } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedPhone = phone.trim()
    const ipAddress = getClientIp(request)
    const userAgent = getUserAgent(request)

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email is already registered' }, { status: 409 })
    }

    const duplicateSignals = await detectDuplicateAccountSignals({
      email: normalizedEmail,
      phone: normalizedPhone,
      ipAddress,
    })

    const hashedPassword = await hashPassword(password)
    const sanitizedName = sanitizePlainText(name, 80)
      const sanitizedCommercialRegister = sanitizePlainText(commercialRegister, 50)
      const sanitizedTaxNumber = sanitizePlainText(taxNumber, 30)
      const sanitizedCompanyName = sanitizePlainText(companyName, 120)

      const user = await prisma.$transaction(async (tx: TxClient) => {
        const createdUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            password: hashedPassword,
            name: sanitizedName,
            role,
            phone: normalizedPhone,
            status: UserStatus.PENDING_VERIFICATION,
          },
        })

        if (role === Role.SUPPLIER) {
          const supplier = await tx.supplier.create({
            data: {
              userId: createdUser.id,
              companyName: sanitizedCompanyName,
              commercialRegister: sanitizedCommercialRegister,
              taxNumber: sanitizedTaxNumber,
            },
          })

          await tx.supplierVerification.create({
            data: {
              supplierId: supplier.id,
              status: 'PENDING',
            },
          })
        }

        if (role === Role.TRADER) {
          const trader = await tx.trader.create({
            data: {
              userId: createdUser.id,
              companyName: sanitizedCompanyName,
              taxNumber: sanitizedTaxNumber,
            },
          })

          await tx.traderVerification.create({
            data: {
              traderId: trader.id,
              status: 'PENDING',
            },
          })
        }

        await tx.wallet.create({
          data: {
            userId: createdUser.id,
          },
        })

        return createdUser
      })

    if (duplicateSignals.suspicious) {
      await registerSecurityEvent({
        userId: user.id,
        type: 'DUPLICATE_ACCOUNT',
        severity: 2,
        description: 'Duplicate account signal detected at registration',
        ipAddress,
        userAgent,
        metadata: {
          reasons: duplicateSignals.reasons,
          phone: normalizedPhone,
        },
      })
    }

    const roleLabel = user.role === Role.SUPPLIER
      ? i18nText(language, 'مورد', 'Supplier')
      : i18nText(language, 'تاجر', 'Trader')

    await notifyAdmins({
      type: NotificationType.SYSTEM,
      title: i18nText(language, 'طلب تسجيل جديد بانتظار المراجعة', 'New registration pending approval'),
      message: i18nText(
        language,
        'تم إنشاء حساب جديد ويتطلب موافقة الإدارة.',
        'A new account was created and requires admin approval.',
      ),
      data: {
        kind: 'REGISTRATION_PENDING',
        userId: user.id,
        role: user.role,
        roleLabel,
        name: user.name,
        email: user.email,
        phone: normalizedPhone,
        companyName: sanitizedCompanyName,
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'REGISTER',
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        duplicateSignals: duplicateSignals.reasons,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Registration submitted. Awaiting admin approval.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    })
  } catch (error) {
    console.error('Registration failed:', error)
    return NextResponse.json({ success: false, error: 'Registration failed due to a server error' }, { status: 500 })
  }
}
