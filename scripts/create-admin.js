/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PrismaNeon } = require('@prisma/adapter-neon')

function loadEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename)
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function getArgValue(flag) {
  const direct = process.argv.find((arg) => arg.startsWith(`${flag}=`))
  if (direct) return direct.split('=').slice(1).join('=')

  const index = process.argv.findIndex((arg) => arg === flag)
  if (index === -1) return null
  return process.argv[index + 1] || null
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

async function main() {
  const email = getArgValue('--email') || process.env.ADMIN_EMAIL
  const password = getArgValue('--password') || process.env.ADMIN_PASSWORD
  const name = getArgValue('--name') || process.env.ADMIN_NAME || 'Platform Admin'
  const resetPassword = hasFlag('--reset-password') || process.env.ADMIN_RESET_PASSWORD === 'true'

  if (!process.env.DATABASE_URL) {
    loadEnvFile('.env')
    loadEnvFile('.env.local')
  }

  if (!email || !password) {
    console.error('Missing required args: --email and --password (or ADMIN_EMAIL/ADMIN_PASSWORD).')
    process.exit(1)
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not configured.')
    process.exit(1)
  }

  const adapter = new PrismaNeon({ connectionString })
  const prisma = new PrismaClient({ adapter })

  const hashedPassword = await bcrypt.hash(password, 12)

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })

    await prisma.admin.create({
      data: {
        userId: user.id,
        permissions: [],
      },
    })

    console.log(`Admin created: ${email}`)
  } else {
    await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
        ...(resetPassword ? { password: hashedPassword } : {}),
      },
    })

    await prisma.admin.upsert({
      where: { userId: existing.id },
      update: {},
      create: {
        userId: existing.id,
        permissions: [],
      },
    })

    console.log(`Admin updated: ${email}${resetPassword ? ' (password reset)' : ''}`)
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Failed to create admin:', error)
  process.exit(1)
})

