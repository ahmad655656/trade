// Existing types
export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  confirmPassword: string
  name: string
  role: 'SUPPLIER' | 'TRADER'
  phone?: string
  companyName?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SupplierListItem {
  id: string
  companyName: string
  logo: string | null
  verified: boolean
  rating: number
  totalProducts: number
  totalReviews: number
  totalSales: number
  createdAt: string
  user: {
    name: string
  }
}

export interface SuppliersApiResponse {
  suppliers: SupplierListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SearchableItem {
  id: string
  type: 'product' | 'supplier' | 'category'
  title: string
  description: string
  url: string
  score: number
  price?: number
  rating?: number
  image?: string
}
