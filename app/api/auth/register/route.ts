import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { Role, UserStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { generateToken, hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
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

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email is already registered' }, { status: 409 })
    }
    const hashedPassword = await hashPassword(password)

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          phone: phone || null,
          status: UserStatus.ACTIVE,
        },
      })

      if (role === Role.SUPPLIER) {
        await tx.supplier.create({
          data: {
            userId: createdUser.id,
            companyName: companyName?.trim() || `${name} Store`,
          },
        })
      }

      if (role === Role.TRADER) {
        const trader = await tx.trader.create({
          data: {
            userId: createdUser.id,
            companyName: companyName?.trim() || null,
          },
        })

        await tx.cart.create({
          data: {
            traderId: trader.id,
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

    const token = generateToken(user.id, user.role)
    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

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



