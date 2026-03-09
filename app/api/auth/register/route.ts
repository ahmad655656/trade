import { NextResponse } from 'next/server'
import { Role, UserStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { generateToken, hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validation'
import { sanitizePlainText } from '@/lib/sanitize'
import { assertSameOrigin, getClientIp, getUserAgent, registerSecurityEvent } from '@/lib/security'
import { detectDuplicateAccountSignals } from '@/lib/fraud'
import { writeAuditLog } from '@/lib/audit'
import { setAuthCookies } from '@/lib/session-cookie'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>

export async function POST(request: Request) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

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

    const { email, password, name, role, phone, companyName } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()
    const normalizedPhone = phone?.trim() || null
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
    const sanitizedCompanyName = sanitizePlainText(companyName, 120)

    const user = await prisma.$transaction(async (tx: TxClient) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: sanitizedName,
          role,
          phone: normalizedPhone,
          status: UserStatus.ACTIVE,
        },
      })

      if (role === Role.SUPPLIER) {
        const supplier = await tx.supplier.create({
          data: {
            userId: createdUser.id,
            companyName: sanitizedCompanyName || `${sanitizedName} Store`,
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
            companyName: sanitizedCompanyName || null,
          },
        })

        await Promise.all([
          tx.cart.create({ data: { traderId: trader.id } }),
          tx.favoriteList.create({
            data: {
              traderId: trader.id,
              name: 'Preferred Suppliers',
            },
          }),
          tx.favoriteList.create({
            data: {
              traderId: trader.id,
              name: 'Potential Products',
            },
          }),
        ])
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

    const token = generateToken(user.id, user.role)
    await setAuthCookies(token)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
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
