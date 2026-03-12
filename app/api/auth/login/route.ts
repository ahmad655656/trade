import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { UserStatus } from '@/lib/prisma-enums'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { writeAuditLog } from '@/lib/audit'
import {
  assertSameOrigin,
  detectSuspiciousLogin,
  getClientIp,
  getUserAgent,
  isLoginRateLimited,
  registerLoginAttempt,
  registerSecurityEvent,
} from '@/lib/security'
import { setAuthCookies } from '@/lib/session-cookie'
import { verifyTotpCode } from '@/lib/two-factor'
import { notifyUsers } from '@/lib/notifications'
import { isMissingColumnError, SCHEMA_OUT_OF_SYNC_MESSAGE } from '@/lib/prisma-errors'

const loginUserBaseSelect = {
  id: true,
  email: true,
  password: true,
  name: true,
  role: true,
  status: true,
  supplier: true,
  trader: true,
  admin: true,
} satisfies Prisma.UserSelect

const loginUserExtendedSelect = {
  ...loginUserBaseSelect,
  twoFactorAuth: true,
  twoFactorSecret: true,
} satisfies Prisma.UserSelect

type LoginUserBaseRecord = Prisma.UserGetPayload<{ select: typeof loginUserBaseSelect }>
type LoginUser = LoginUserBaseRecord & { twoFactorAuth: boolean; twoFactorSecret: string | null }

async function findLoginUserByEmail(email: string): Promise<{
  user: LoginUser | null
  supportsAdvancedAuthColumns: boolean
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: loginUserExtendedSelect,
    })
    return {
      user: user
        ? {
            ...user,
            twoFactorAuth: user.twoFactorAuth,
            twoFactorSecret: user.twoFactorSecret,
          }
        : null,
      supportsAdvancedAuthColumns: true,
    }
  } catch (error) {
    if (!isMissingColumnError(error)) throw error

    const fallbackUser = await prisma.user.findUnique({
      where: { email },
      select: loginUserBaseSelect,
    })

    return {
      user: fallbackUser
        ? {
            ...fallbackUser,
            twoFactorAuth: false,
            twoFactorSecret: null,
          }
        : null,
      supportsAdvancedAuthColumns: false,
    }
  }
}

export async function POST(request: Request) {
  const ipAddress = getClientIp(request)
  const userAgent = getUserAgent(request)

  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const body = await request.json()
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message ?? 'Invalid login payload' },
        { status: 400 },
      )
    }

    const { email, password, otp } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()

    if (await isLoginRateLimited(normalizedEmail, ipAddress)) {
      await registerSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        description: 'Login rate limit exceeded',
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail },
      })
      return NextResponse.json({ success: false, error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const { user, supportsAdvancedAuthColumns } = await findLoginUserByEmail(normalizedEmail)

    if (!user) {
      await registerLoginAttempt({
        email: normalizedEmail,
        ipAddress,
        userAgent,
        success: false,
      })
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      await registerLoginAttempt({
        userId: user.id,
        email: normalizedEmail,
        ipAddress,
        userAgent,
        success: false,
      })
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    if (user.status !== UserStatus.ACTIVE) {
      await registerLoginAttempt({
        userId: user.id,
        email: normalizedEmail,
        ipAddress,
        userAgent,
        success: false,
      })
      return NextResponse.json({ success: false, error: 'Your account is not active. Contact support.' }, { status: 403 })
    }

    if (user.twoFactorAuth) {
      const secret = user.twoFactorSecret
      if (!secret) {
        await registerSecurityEvent({
          userId: user.id,
          type: 'FAILED_2FA',
          description: '2FA enabled without secret',
          ipAddress,
          userAgent,
        })
        return NextResponse.json({ success: false, error: '2FA setup invalid. Contact support.' }, { status: 403 })
      }

      if (!otp || !verifyTotpCode(secret, otp)) {
        await registerLoginAttempt({
          userId: user.id,
          email: normalizedEmail,
          ipAddress,
          userAgent,
          success: false,
        })
        await registerSecurityEvent({
          userId: user.id,
          type: 'FAILED_2FA',
          description: '2FA verification failed',
          ipAddress,
          userAgent,
        })
        return NextResponse.json({ success: false, error: 'Two-factor code is required or invalid', requiresTwoFactor: true }, { status: 401 })
      }
    }

    const suspicious = await detectSuspiciousLogin(user.id, ipAddress, userAgent)
    if (suspicious) {
      await registerSecurityEvent({
        userId: user.id,
        type: 'SUSPICIOUS_LOGIN',
        severity: 2,
        description: 'Suspicious login detected from new device or IP',
        ipAddress,
        userAgent,
      })

      await notifyUsers({
        userIds: [user.id],
        type: 'SECURITY_ALERT',
        title: 'Suspicious login activity',
        message: 'A login was detected from a new IP/device. If this was not you, change your password immediately.',
      })
    }

    const postLoginTasks: Array<Promise<unknown>> = [
      registerLoginAttempt({
        userId: user.id,
        email: normalizedEmail,
        ipAddress,
        userAgent,
        success: true,
      }),
    ]

    if (supportsAdvancedAuthColumns) {
      postLoginTasks.push(
        prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        }),
      )
    }

    await Promise.all(postLoginTasks)

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
    })

    const token = generateToken(user.id, user.role)
    await setAuthCookies(token)

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
          twoFactorAuth: user.twoFactorAuth,
        },
      },
    })
  } catch (error) {
    console.error('Login failed:', error)
    if (isMissingColumnError(error)) {
      return NextResponse.json({ success: false, error: SCHEMA_OUT_OF_SYNC_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: 'Login failed due to a server error' }, { status: 500 })
  }
}
