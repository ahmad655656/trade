# Remove Email Verification - Complete Removal Plan

## Goal: Delete all email verification completely (no tokens, no checks, auto-verified)

## Steps:
1. ✅ Create this TODO
2. 🔄 Update prisma/schema.prisma - Remove verification fields
3. 🔄 prisma migrate + generate
4. 🔄 app/api/auth/register/route.ts - Auto verified=true, remove email logic
5. 🗑️ Delete app/api/auth/resend-verification/route.ts
6. 🗑️ Delete app/api/auth/verify/route.ts  
7. 🗑️ Delete app/verify-email/page.tsx
8. 🔄 lib/email.ts - Remove verification functions or keep generic
9. 🔄 app/register/page.tsx - Remove verification UX/notices
10. 🔄 app/login/page.ts - Remove verification check logic
11. 🔄 app/api/auth/login/route.ts - Remove verified check
12. 🔄 lib/session.ts / auth checks - Remove verified
13. ✅ Update TODO & complete

**Current Status:** Email verification fully implemented - safe to remove.
