import { z } from 'zod'

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter')
  .regex(/[0-9]/, 'Password must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character')

export const registerSchema = z
  .object({
    email: z.string().trim().email('Please provide a valid email address'),
    password: strongPassword,
    confirmPassword: z.string(),
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    role: z.enum(['SUPPLIER', 'TRADER']),
    phone: z.string().trim().max(30).optional(),
    companyName: z.string().trim().max(120).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Password confirmation does not match',
  })

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const productCreateSchema = z.object({
  nameAr: z.string().trim().min(2, 'Arabic name is required'),
  nameEn: z.string().trim().max(200).optional(),
  descriptionAr: z.string().trim().max(4000).optional(),
  descriptionEn: z.string().trim().max(4000).optional(),
  categoryId: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
  price: z.number().positive('Price must be greater than 0'),
  compareAtPrice: z.number().positive().optional(),
  quantity: z.number().int().min(0),
  minOrderQuantity: z.number().int().min(1).optional(),
  sku: z.string().trim().max(80).optional(),
  images: z.array(z.string().trim()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DRAFT', 'PENDING_REVIEW', 'REJECTED']).optional(),
})

export const productUpdateSchema = productCreateSchema.partial()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
