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
