import { prisma } from '@/lib/prisma'
import { getClientIp, getUserAgent } from '@/lib/security'

export async function writeAuditLog(params: {
  request?: Request
  actorUserId?: string | null
  actorRole?: 'ADMIN' | 'SUPPLIER' | 'TRADER' | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: unknown
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId || null,
        actorRole: params.actorRole || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        ipAddress: params.request ? getClientIp(params.request) : null,
        userAgent: params.request ? getUserAgent(params.request) : null,
        metadata: (params.metadata as object | undefined) ?? undefined,
      },
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}

