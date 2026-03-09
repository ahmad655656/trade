import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { twoFactorVerifySchema } from '@/lib/validation'
import { verifyTotpCode } from '@/lib/two-factor'
import { writeAuditLog } from '@/lib/audit'
import { assertSameOrigin } from '@/lib/security'
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

    if (!user.twoFactorAuth || !user.twoFactorSecret) {
      return NextResponse.json({ success: false, error: '2FA is not enabled' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = twoFactorVerifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid OTP' }, { status: 400 })
    }

    if (!verifyTotpCode(user.twoFactorSecret, parsed.data.otp)) {
      return NextResponse.json({ success: false, error: 'Invalid OTP' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorAuth: false,
        twoFactorSecret: null,
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: '2FA_DISABLED',
      entityType: 'USER',
      entityId: user.id,
    })

    return NextResponse.json({ success: true, message: 'Two-factor authentication disabled' })
  } catch (error) {
    console.error('2FA disable failed:', error)
    if (isMissingColumnError(error)) {
      return NextResponse.json({ success: false, error: SCHEMA_OUT_OF_SYNC_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: '2FA disable failed' }, { status: 500 })
  }
}
