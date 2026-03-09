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
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits').optional(),
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

export const twoFactorVerifySchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
})

export const kycSubmissionSchema = z.object({
  phoneVerified: z.boolean().optional(),
  addressVerified: z.boolean().optional(),
  documents: z
    .array(
      z.object({
        type: z.enum(['ID_DOCUMENT', 'BUSINESS_REGISTRATION', 'PHONE_PROOF', 'ADDRESS_PROOF']),
        fileUrl: z.string().trim().min(1),
      }),
    )
    .max(10)
    .optional(),
})

export const disputeCreateSchema = z.object({
  orderId: z.string().trim().min(1),
  reason: z.enum(['NOT_AS_DESCRIBED', 'DAMAGED_GOODS', 'MISSING_ITEMS', 'OTHER']),
  description: z.string().trim().min(10).max(4000),
  images: z.array(z.string().trim()).max(10).optional(),
})

export const disputeMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  attachments: z.array(z.string().trim()).max(10).optional(),
})

export const rfqCreateSchema = z.object({
  productRequest: z.string().trim().min(3).max(400),
  quantity: z.number().int().min(1),
  deliveryLocation: z.string().trim().min(3).max(200),
  notes: z.string().trim().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
})

export const rfqQuoteSchema = z.object({
  price: z.number().positive(),
  availableQuantity: z.number().int().min(1),
  estimatedShippingDays: z.number().int().min(1).max(90),
  notes: z.string().trim().max(2000).optional(),
})

export const orderReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  qualityRating: z.number().int().min(1).max(5),
  deliverySpeedRating: z.number().int().min(1).max(5),
  descriptionAccuracyRating: z.number().int().min(1).max(5),
  communicationRating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  comment: z.string().trim().max(4000).optional(),
  images: z.array(z.string().trim()).max(10).optional(),
})

export const favoriteListCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
})

export const favoriteListItemSchema = z
  .object({
    targetType: z.enum(['PRODUCT', 'SUPPLIER']),
    productId: z.string().trim().optional(),
    supplierId: z.string().trim().optional(),
  })
  .refine((value) => {
    if (value.targetType === 'PRODUCT') return Boolean(value.productId)
    return Boolean(value.supplierId)
  }, 'Target ID is required for selected target type')

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ProductCreateInput = z.infer<typeof productCreateSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>
