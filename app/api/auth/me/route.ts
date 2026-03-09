import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'

export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        twoFactorAuth: user.twoFactorAuth,
        emailNotifications: user.emailNotifications,
        supplier: user.supplier,
        trader: user.trader,
        admin: user.admin,
      },
    })
  } catch (error) {
    console.error('Session check failed:', error)
    return NextResponse.json({ success: false, error: 'Failed to load session' }, { status: 500 })
  }
}
