import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { generateOtpAuthUrl, generateTwoFactorSecret } from '@/lib/two-factor'
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

    const secret = generateTwoFactorSecret()
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        twoFactorAuth: false,
      },
    })

    await writeAuditLog({
      request,
      actorUserId: user.id,
      actorRole: user.role,
      action: '2FA_SECRET_GENERATED',
      entityType: 'USER',
      entityId: user.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        secret,
        otpauthUrl: generateOtpAuthUrl({
          email: user.email,
          secret,
          issuer: 'Trade Platform',
        }),
      },
    })
  } catch (error) {
    console.error('2FA setup failed:', error)
    if (isMissingColumnError(error)) {
      return NextResponse.json({ success: false, error: SCHEMA_OUT_OF_SYNC_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ success: false, error: '2FA setup failed' }, { status: 500 })
  }
}
