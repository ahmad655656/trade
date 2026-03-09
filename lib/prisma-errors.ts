import { Prisma } from '@prisma/client'

export function isMissingColumnError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022'
}

export const SCHEMA_OUT_OF_SYNC_MESSAGE =
  'Database schema is out of sync. Run: npx prisma db push'
