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
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
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

export const OrderStatus = {
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
