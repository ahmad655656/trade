export const Role = {
  ADMIN: 'ADMIN',
  SUPPLIER: 'SUPPLIER',
  TRADER: 'TRADER',
} as const
export type Role = (typeof Role)[keyof typeof Role]

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export const NotificationType = {
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  DELIVERY_CONFIRMED: 'DELIVERY_CONFIRMED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  DISPUTE_UPDATED: 'DISPUTE_UPDATED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  RFQ_RECEIVED: 'RFQ_RECEIVED',
  RFQ_QUOTED: 'RFQ_QUOTED',
  SECURITY_ALERT: 'SECURITY_ALERT',
  WITHDRAWAL_COMPLETED: 'WITHDRAWAL_COMPLETED',
  REVIEW_RECEIVED: 'REVIEW_RECEIVED',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  PRODUCT_OUT_OF_STOCK: 'PRODUCT_OUT_OF_STOCK',
  PRICE_CHANGE: 'PRICE_CHANGE',
  PROMOTION: 'PROMOTION',
  SYSTEM: 'SYSTEM',
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const ProductStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  REJECTED: 'REJECTED',
} as const
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus]

export const AddressType = {
  HOME: 'HOME',
  WORK: 'WORK',
  OTHER: 'OTHER',
} as const
export type AddressType = (typeof AddressType)[keyof typeof AddressType]

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  WALLET: 'WALLET',
  INSTALLMENT: 'INSTALLMENT',
} as const
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]

export const PaymentPurpose = {
  PLATFORM_FEE: 'PLATFORM_FEE',
  FULL_PAYMENT: 'FULL_PAYMENT',
  REFUND: 'REFUND',
} as const
export type PaymentPurpose = (typeof PaymentPurpose)[keyof typeof PaymentPurpose]

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export const OrderStatus = {
  PENDING_PLATFORM_FEE_PAYMENT: 'PENDING_PLATFORM_FEE_PAYMENT',
  WAITING_FOR_PAYMENT_VERIFICATION: 'WAITING_FOR_PAYMENT_VERIFICATION',
  PLATFORM_FEE_CONFIRMED: 'PLATFORM_FEE_CONFIRMED',
  WAITING_FOR_ADMIN_REVIEW: 'WAITING_FOR_ADMIN_REVIEW',
  ADMIN_APPROVED: 'ADMIN_APPROVED',
  ADMIN_REJECTED: 'ADMIN_REJECTED',
  SUPPLIER_PREPARING_ORDER: 'SUPPLIER_PREPARING_ORDER',
  AWAITING_DELIVERY_CONFIRMATION: 'AWAITING_DELIVERY_CONFIRMATION',
  ORDER_CLOSED: 'ORDER_CLOSED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  COMPLETED: 'COMPLETED',
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const OrderItemStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const
export type OrderItemStatus = (typeof OrderItemStatus)[keyof typeof OrderItemStatus]

export const ShippingStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const
export type ShippingStatus = (typeof ShippingStatus)[keyof typeof ShippingStatus]

export const SupplierVerificationStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type SupplierVerificationStatus = (typeof SupplierVerificationStatus)[keyof typeof SupplierVerificationStatus]

export const VerificationDocumentType = {
  ID_DOCUMENT: 'ID_DOCUMENT',
  BUSINESS_REGISTRATION: 'BUSINESS_REGISTRATION',
  PHONE_PROOF: 'PHONE_PROOF',
  ADDRESS_PROOF: 'ADDRESS_PROOF',
} as const
export type VerificationDocumentType = (typeof VerificationDocumentType)[keyof typeof VerificationDocumentType]

export const DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const
export type DisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus]

export const DisputeReason = {
  NOT_AS_DESCRIBED: 'NOT_AS_DESCRIBED',
  DAMAGED_GOODS: 'DAMAGED_GOODS',
  MISSING_ITEMS: 'MISSING_ITEMS',
  OTHER: 'OTHER',
} as const
export type DisputeReason = (typeof DisputeReason)[keyof typeof DisputeReason]

export const RfqStatus = {
  OPEN: 'OPEN',
  QUOTED: 'QUOTED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const
export type RfqStatus = (typeof RfqStatus)[keyof typeof RfqStatus]

export const FavoriteTargetType = {
  PRODUCT: 'PRODUCT',
  SUPPLIER: 'SUPPLIER',
} as const
export type FavoriteTargetType = (typeof FavoriteTargetType)[keyof typeof FavoriteTargetType]

export const SecurityEventType = {
  SUSPICIOUS_LOGIN: 'SUSPICIOUS_LOGIN',
  DUPLICATE_ACCOUNT: 'DUPLICATE_ACCOUNT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FAILED_2FA: 'FAILED_2FA',
  ADMIN_ACTION: 'ADMIN_ACTION',
} as const
export type SecurityEventType = (typeof SecurityEventType)[keyof typeof SecurityEventType]
