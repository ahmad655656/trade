import { prisma } from '@/lib/prisma'

const DEFAULT_COMMISSION_RATE = 0.03

export async function getPlatformCommissionRate() {
  const configured = await prisma.setting.findUnique({
    where: { key: 'platform_commission_rate' },
    select: { value: true },
  })

  if (!configured) return DEFAULT_COMMISSION_RATE

  const raw = configured.value as { rate?: unknown }
  const rate = Number(raw?.rate)
  if (!Number.isFinite(rate) || rate < 0 || rate > 0.5) return DEFAULT_COMMISSION_RATE
  return rate
}

export function calculatePlatformFee(orderSubtotal: number, rate: number) {
  const safeSubtotal = Number.isFinite(orderSubtotal) ? Math.max(orderSubtotal, 0) : 0
  const safeRate = Number.isFinite(rate) ? Math.max(rate, 0) : DEFAULT_COMMISSION_RATE
  return Number((safeSubtotal * safeRate).toFixed(2))
}

