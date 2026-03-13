# TypeScript Build Fix - Vercel Deploy
Status: 🔄 In Progress

## Problem
**ACTUAL TS ERROR FOUND** (local npm run build):

```
./app/api/uploads/product-image/route.ts:50:32
Type error: 'error' is of type 'unknown'.

  48 |     console.error('Product image upload failed:', error)
  49 |     return NextResponse.json(
> 50 |       { success: false, error: error.message || 'Upload failed' },
     |X^
```

**Old issue** (SearchableItem price) was already fixed per TODO-Deploy-Fix.md

## Root Cause
- Code fixed in lib/ai-search-client.ts (SearchableItem now has price?: number)
- Stale Vercel/.next cache or Prisma client types
- postinstall prisma generate runs v7.4.2 (update available → 7.5.0)

## Execution Plan
```
✅ 1. Verify local build: npm run build
✅ 2. Prisma regenerate: npx prisma generate
✅ 3. Clean caches: rm -rf .next node_modules/.cache && npm install
✅ 4. Test build: npm run build
✅ 5. Update Prisma: npm i --save-dev prisma@latest @prisma/client@latest
✅ 6. Final build test
✅ **FIX APPLIED:** Type guard for unknown error in app/api/uploads/product-image/route.ts

```
const errorMessage = error instanceof Error ? error.message : 'Upload failed'
```

⏳ 3. Clean caches (PowerShell: Remove-Item -Recurse .next)
✅ 5. Prisma updated to latest ✅
⏳ 4. Final clean build test
⏳ 7. Vercel: Redeploy + Clear cache (https://vercel.com/[your-account]/trade?tab=deployments → ... → Redeploy (clear cache))
⏳ 8. Verify /search & /api/uploads/product-image work
```

## Commands Executed
```bash
npm run build
npx prisma generate
```

**Next:** Continue cache cleaning + Prisma update + Vercel redeploy

