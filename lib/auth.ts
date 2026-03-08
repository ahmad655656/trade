import bcrypt from 'bcryptjs'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { Role } from '@prisma/client'

const TOKEN_ISSUER = 'trade-platform'
const TOKEN_AUDIENCE = 'trade-users'
const TOKEN_EXPIRY = '7d'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables')
  }
  return secret
}

export type AppTokenPayload = JwtPayload & {
  userId: string
  role: Role
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string, role: Role): string {
  return jwt.sign({ userId, role }, getJwtSecret(), {
    algorithm: 'HS256',
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    expiresIn: TOKEN_EXPIRY,
  })
}

export function verifyToken(token: string): AppTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }) as AppTokenPayload

    if (!decoded?.userId || !decoded?.role) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}
