// Email service - Professional bilingual (AR/EN) emails via Resend
import { randomBytes } from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const IS_DEV = process.env.NODE_ENV !== 'production'
const SEND_IN_DEV = process.env.EMAIL_SEND_IN_DEV === 'true'

interface SendVerificationEmailParams {
  email: string
  name: string
  token: string
}

export async function sendVerificationEmail({ email, name, token }: SendVerificationEmailParams): Promise<boolean> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`
  try {
    if (IS_DEV && !SEND_IN_DEV) {
      console.log(`[DEV] Email verification link for ${email}: ${verifyUrl}`)
      return true
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    const emailFrom = process.env.EMAIL_FROM?.trim()
    if (!resendApiKey || !emailFrom) {
      console.error('Email service not configured. Set RESEND_API_KEY and EMAIL_FROM in .env')
      return false
    }

    const emailFromLower = emailFrom.toLowerCase()
    if (emailFromLower.includes('yourdomain.com') || emailFromLower.includes('example.com') || !emailFrom) {
      console.error('EMAIL_FROM must be a verified sender domain (no placeholders)')
      return false
    }

    const resend = await import('resend').then(m => m.Resend)
    const resendClient = new resend(resendApiKey)

    // Detect language from email domain or default to EN (enhance with user pref later)
    const isArabicEmail = email.endsWith('.sa') || email.endsWith('.ae') || email.includes('@hotmail.sa')
    const lang = isArabicEmail ? 'ar' : 'en'

    const subjects = {
      ar: 'مهم: قم بتفعيل حسابك الآن',
      en: 'Important: Verify your email address',
    }

    const texts = {
      ar: `مرحباً ${name},

شكراً لتسجيلك! يرجى تفعيل حسابك بالضغط على الرابط أدناه:
${verifyUrl}

الرابط صالح لمدة 24 ساعة فقط. إذا لم تسجل، يرجى تجاهل هذا البريد.

مع خالص التحية,
فريق المنصة`,
      en: `Hello ${name},

Thank you for registering! Please verify your email by visiting the link below:
${verifyUrl}

This link expires in 24 hours. If you didn't create an account, please ignore this email.

Best regards,
Platform Team`,
    }

    const htmls = {
      ar: `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 14px 28px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { margin-top: 30px; font-size: 13px; color: #666; text-align: center; }
    h1, h2 { color: #1F2937; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🎉 تفعيل حسابك</h2>
    <p>مرحباً <strong>${name}</strong>,</p>
    <p>شكراً لانضمامك إلينا! انقر على الزر أدناه لتفعيل حسابك:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" class="button">تفعيل الحساب</a>
    </p>
    <p>أو انسخ الرابط التالي:</p>
    <p style="word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace; direction: ltr; text-align: center;">${verifyUrl}</p>
    <div class="footer">
      <p>الرابط صالح لمدة <strong>24 ساعة</strong> فقط.</p>
      <p>إذا لم تسجل، يرجى تجاهل هذا البريد.</p>
    </div>
  </div>
</body>
</html>`,
      en: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 14px 28px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { margin-top: 30px; font-size: 13px; color: #666; text-align: center; }
    h1, h2 { color: #1F2937; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🎉 Verify Your Account</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Thank you for joining us! Click the button below to activate your account:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" class="button">Verify Email</a>
    </p>
    <p>Or copy and paste this link:</p>
    <p style="word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 6px; font-family: monospace;">${verifyUrl}</p>
    <div class="footer">
      <p>This link expires in <strong>24 hours</strong>.</p>
      <p>If you didn\\'t register, please ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
    }

    await resendClient.emails.send({
      from: emailFrom,
      to: email,
      subject: subjects[lang as 'ar' | 'en'],
      headers: {
        'Importance': 'high',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
      },
      text: texts[lang as 'ar' | 'en'],
      html: htmls[lang as 'ar' | 'en'],
    })

    console.log(`✅ Verification email sent to ${email} (${lang})`)
    return true

  } catch (error) {
    console.error('❌ Failed to send verification email to', email, error)
    return false
  }
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex')
}
