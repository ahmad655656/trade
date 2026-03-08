export type LocalizedText = {
  ar: string
  en: string
}

export type OrderStatus = 'PROCESSING' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'PAID' | 'PENDING' | 'FAILED'
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DRAFT'

export type SupplierProduct = {
  id: string
  thumbnail: string
  nameAr: string
  nameEn: string
  category: string
  price: number
  discountPrice?: number
  stock: number
  minStock: number
  status: ProductStatus
  views: number
  sales: number
  rating: number
  createdAt: string
  sku: string
}

export type SupplierOrder = {
  id: string
  traderName: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  orderedAt: string
  updatedAt: string
}

export type SupplierReview = {
  id: string
  reviewerName: string
  productName: string
  rating: number
  comment: string
  createdAt: string
  replied: boolean
}

export type SalesPoint = {
  label: string
  value: number
}

export type CategoryStat = {
  label: string
  value: number
}

export type DashboardMetric = {
  key: string
  label: LocalizedText
  value: string
  delta: string
  tone?: 'normal' | 'warning' | 'danger'
}

export type StoreBankAccount = {
  id: string
  bankName: string
  accountNumber: string
  iban: string
  isDefault: boolean
}

export type WalletTransaction = {
  id: string
  date: string
  description: string
  amount: number
  type: 'IN' | 'OUT'
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
}
