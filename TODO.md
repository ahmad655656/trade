# Manual Orders & Disputes Enhancement Plan

## Step 1: [✅] Schema Update (prisma/schema.prisma)
- Add `supplierPaymentConfirmedAt DateTime?` to Order model ✓
- Add `SUPPLIER_PAYMENT_CONFIRMED` to OrderStatus enum ✓
- Run `npx prisma db push && npx prisma generate` **(User: run & confirm)**

## Step 2: [✅] Update Labels & Timeline (lib/order-labels.ts, lib/order-timeline.ts)
- Add labels/titles for `SUPPLIER_PAYMENT_CONFIRMED` ✓
- Update status flows ✓

## Step 3: [ ] Add Serial Cash Constant (lib/commission.ts or new lib/constants.ts)
- Export `SERIAL_CASH_NUMBER = '0983796029'`

## Step 4: [✅] Create Supplier Confirm Payment API (app/api/supplier/orders/[id]/confirm-payment/route.ts)
- POST endpoint for supplier to confirm cash received → SUPPLIER_PAYMENT_CONFIRMED → trigger payout ✓

## Step 5: [✅] Update Trader Orders UI (app/trader/orders/page.tsx)
- Hardcode Serial Cash number in transferTo default & UI text ✓

## Step 6: [✅] Update Supplier Orders UI (app/supplier/orders/page.tsx)
- Add "Confirm Payment Received" button for eligible orders ✓

## Step 7: [✅] Update Trader Confirm Delivery (app/api/trader/orders/[id]/confirm-delivery/route.ts)
- After DELIVERED → ORDER_CLOSED, notify supplier to confirm payment ✓

## Step 8: [ ] Enhance Dispute Policy (app/dispute-policy/page.tsx)
- Add timers/escalation info

## Step 9: [ ] Update Types/Enums (types/index.ts, lib/prisma-enums.ts)

## Step 10: [ ] Test Full Flow
- Create order → platform fee → delivery → supplier payment confirm → dispute test

## Step 11: [ ] Prisma Migration & Deploy Prep

**Current Progress: Starting Step 1**
