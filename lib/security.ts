import { prisma } from '@/lib/prisma'

const LOGIN_WINDOW_MINUTES = 15
const LOGIN_ATTEMPT_LIMIT = 5

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return null
}

export function getUserAgent(request: Request) {
  return request.headers.get('user-agent') || null
}

export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return null

  const origin = request.headers.get('origin')
  if (!origin) return 'Missing origin header'

  try {
    const requestUrl = new URL(request.url)
    const originUrl = new URL(origin)
    if (requestUrl.origin !== originUrl.origin) {
      return 'Cross-origin request rejected'
    }
    return null
  } catch {
    return 'Invalid origin header'
  }
}

export async function isLoginRateLimited(email: string, ipAddress: string | null) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000)
  const [byEmail, byIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: { gte: since },
      },
    }),
    ipAddress
      ? prisma.loginAttempt.count({
          where: {
            ipAddress,
            success: false,
            createdAt: { gte: since },
          },
        })
      : Promise.resolve(0),
  ])

  return byEmail >= LOGIN_ATTEMPT_LIMIT || byIp >= LOGIN_ATTEMPT_LIMIT
}

export async function registerLoginAttempt(params: {
  userId?: string | null
  email: string
  ipAddress?: string | null
  userAgent?: string | null
  success: boolean
}) {
  await prisma.loginAttempt.create({
    data: {
      userId: params.userId || null,
      email: params.email.toLowerCase(),
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      success: params.success,
    },
  })
}

export async function registerSecurityEvent(params: {
  userId?: string | null
  type: 'SUSPICIOUS_LOGIN' | 'DUPLICATE_ACCOUNT' | 'RATE_LIMIT_EXCEEDED' | 'FAILED_2FA' | 'ADMIN_ACTION'
  description: string
  severity?: number
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: unknown
}) {
  await prisma.securityEvent.create({
    data: {
      userId: params.userId || null,
      type: params.type,
      description: params.description,
      severity: params.severity ?? 1,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      metadata: (params.metadata as object | undefined) ?? undefined,
    },
  })
}

export async function detectSuspiciousLogin(userId: string, ipAddress: string | null, userAgent: string | null) {
  const lastSuccessful = await prisma.loginAttempt.findFirst({
    where: {
      userId,
      success: true,
      NOT: { ipAddress: null },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!lastSuccessful || !ipAddress) return false

  const ipChanged = lastSuccessful.ipAddress !== ipAddress
  const uaChanged = Boolean(userAgent && lastSuccessful.userAgent && lastSuccessful.userAgent !== userAgent)
  return ipChanged || uaChanged
}

