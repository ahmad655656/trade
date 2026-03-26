// Central place for platform-wide contact details and other constants.
// These can be overridden via environment variables in deployments.

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'haedarahasan69@gmail.com'
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '0983796029'
export const SUPPORT_ADDRESS = process.env.NEXT_PUBLIC_SUPPORT_ADDRESS ?? 'Riyadh, Saudi Arabia'

// Number that traders should send Syriatel Cash transfers to (platform fee).
export const SYRIATEL_CASH_NUMBER = process.env.NEXT_PUBLIC_SYRIATEL_CASH_NUMBER ?? '0983796029'
