import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/session-cookie'

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    await clearAuthCookies(response)

    return response
  } catch (error) {
    console.error('Logout failed:', error)
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
  }
}
