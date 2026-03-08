import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/', '/login', '/register', '/forbidden', '/products', '/suppliers', '/about']

const ROLE_ROUTE_MAP: Record<string, string[]> = {
  ADMIN: ['/dashboard/admin'],
  SUPPLIER: ['/dashboard/supplier'],
  TRADER: ['/dashboard/trader', '/trader'],
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith('/products/') || pathname.startsWith('/suppliers/'),
  )
}

function getRoleFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const role = (payload as { role?: unknown }).role
  return typeof role === 'string' ? role : null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname) || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secretValue = process.env.JWT_SECRET
    if (!secretValue) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const secret = new TextEncoder().encode(secretValue)
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'trade-platform',
      audience: 'trade-users',
      algorithms: ['HS256'],
    })

    if (pathname.startsWith('/dashboard') || pathname.startsWith('/trader')) {
      const role = getRoleFromPayload(payload)
      if (!role) {
        return NextResponse.redirect(new URL('/forbidden', request.url))
      }

      const allowedPrefixes = ROLE_ROUTE_MAP[role] ?? []
      const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix))

      if (!isAllowed) {
        return NextResponse.redirect(new URL('/forbidden', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/trader/:path*', '/api/protected/:path*'],
}
