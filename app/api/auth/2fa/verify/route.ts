import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { twoFactorVerifySchema } from '@/lib/validation'
import { verifyTotpCode } from '@/lib/two-factor'
import { writeAuditLog } from '@/lib/audit'
import { assertSameOrigin, getClientIp, getUserAgent, registerSecurityEvent } from '@/lib/security'
import { isMissingColumnError, SCHEMA_OUT_OF_SYNC_MESSAGE } from '@/lib/prisma-errors'

export async function POST(request: Request) {
  try {
    const sameOriginError = assertSameOrigin(request)
    if (sameOriginError) {
      return NextResponse.json({ success: false, error: sameOriginError }, { status: 403 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = twoFactorVerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid OTP' }, { status: 400 })
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json({ success: false, error: '2FA setup is missing. Generate secret first.' }, { status: 400 })
    }

    if (!verifyTotpCode(user.twoFactorSecret, parsed.data.otp)) {
      await registerSecurityEvent({
        userId: user.id,
        type: 'FAILED_2FA',
        description: 'Failed 2FA activation verification',
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      })
      return NextResponse.json({ success: false, error: 'Invalid OTP' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorAuth: true },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: '2FA_ENABLED',
      entityType: 'USER',
      entityId: user.id,
    })

    return NextResponse.json({ success: true, message: 'Two-factor authentication enabled' })
  } catch (error) {
    console.error('2FA verification failed:', error)
    if (isMissingColumnError(error)) {
      return NextResponse.json({ success: false, error: SCHEMA_OUT_OF_SYNC_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: '2FA verification failed' }, { status: 500 })
  }
}
