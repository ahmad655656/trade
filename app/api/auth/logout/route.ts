import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/session-cookie'

export async function POST() {
  try {
    await clearAuthCookies()

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout failed:', error)
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
  }
}
