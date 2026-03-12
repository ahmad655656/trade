// Email service - Professional bilingual (AR/EN) emails via Resend
import { randomBytes } from 'crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const IS_DEV = process.env.NODE_ENV !== 'production'
const SEND_IN_DEV = process.env.EMAIL_SEND_IN_DEV === 'true'

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  try {
    if (IS_DEV && !SEND_IN_DEV) {
      console.log(`[DEV] Welcome email for ${email}`)
      return true
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    const emailFrom = process.env.EMAIL_FROM?.trim()
    if (!resendApiKey || !emailFrom) {
      console.error('Email service not configured')
      return false
    }

    const resend = await import('resend').then(m => m.Resend)
    const resendClient = new resend(resendApiKey)

    const isArabicEmail = email.endsWith('.sa') || email.endsWith('.ae') || email.includes('@hotmail.sa')
    const lang = isArabicEmail ? 'ar' : 'en'

    const subjects = {
      ar: '🎉 مرحباً بك في المنصة',
      en: '🎉 Welcome to the Platform',
    }

    const texts = {
      ar: `مرحباً ${name}, شكراً لانضمامك! يمكنك الآن البدء في استخدام حسابك.`,
      en: `Hello ${name}, thank you for joining! You can now start using your account.`,
    }

    const htmls = {
      ar: `
<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4F46E5;">🎉 مرحباً بك</h2>
  <p>مرحباً <strong>${name}</strong>,</p>
  <p>شكراً لانضمامك إلينا! حسابك جاهز للاستخدام.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 14px 28px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">ابدأ الآن</a>
  </p>
</body>
</html>`,
      en: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #4F46E5;">🎉 Welcome</h2>
  <p>Hello <strong>${name}</strong>,</p>
  <p>Thank you for joining! Your account is ready.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 14px 28px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Get Started</a>
  </p>
</body>
</html>`,
    }

    await resendClient.emails.send({
      from: emailFrom,
      to: email,
      subject: subjects[lang as 'ar' | 'en'],
      text: texts[lang as 'ar' | 'en'],
      html: htmls[lang as 'ar' | 'en'],
    })

    console.log(`✅ Welcome email sent to ${email}`)
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}


// Removed verification functions - accounts auto-active
export function generateRandomToken(): string {
  return randomBytes(32).toString('hex')
}

