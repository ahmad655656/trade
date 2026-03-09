import { prisma } from '@/lib/prisma'

export async function detectDuplicateAccountSignals(params: {
  email: string
  phone?: string | null
  ipAddress?: string | null
}) {
  const reasons: string[] = []

  if (params.phone?.trim()) {
    const usedPhoneCount = await prisma.user.count({
      where: { phone: params.phone.trim() },
    })
    if (usedPhoneCount > 0) {
      reasons.push('Phone number is already linked to another account')
    }
  }

  if (params.ipAddress) {
    const recentSignupsFromIp = await prisma.securityEvent.count({
      where: {
        type: 'DUPLICATE_ACCOUNT',
        ipAddress: params.ipAddress,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (recentSignupsFromIp >= 3) {
      reasons.push('Multiple suspicious signups from the same IP in 24h')
    }
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  }
}

