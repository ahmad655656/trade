import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { UserStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message ?? 'Invalid login payload' },
        { status: 400 },
      )
    }

    const { email, password } = validationResult.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        supplier: true,
        trader: true,
        admin: true,
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    if (user.status !== UserStatus.ACTIVE) {
      return NextResponse.json({ success: false, error: 'Your account is not active. Contact support.' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
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
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
    })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ success: false, error: 'Login failed due to a server error' }, { status: 500 })
  }
}
