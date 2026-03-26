# Strict Account Verification TODO

Status: Implementing mandatory ID/business verification for TRADER/SUPPLIER.

## Steps
- [ ] 1. Update Prisma schema (TraderVerification model, UserStatus.PENDING_VERIFICATION)
- [ ] 2. Migrate DB
- [ ] 3. Update lib/validation.ts registerSchema
- [ ] 4. Update app/register/page.tsx (mandatory fields + ID upload)
- [ ] 5. Update app/api/auth/register/route.ts (PENDING status, upload, no auto-login)
- [ ] 6. Create app/trader/verify/page.tsx + supplier equivalent
- [ ] 7. Guards in layouts (/trader, /dashboard/supplier)
- [ ] 8. Update /api/auth/me to include verificationStatus
- [ ] 9. Enhance /api/uploads/verification/route.ts
- [ ] 10. Test full flow
- [ ] Complete

Updated per step.

