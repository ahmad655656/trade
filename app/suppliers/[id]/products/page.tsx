'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CloudImage } from '@/components/common/CloudImage'
import { formatSypAmount } from '@/lib/currency'
import { useUi } from '@/components/providers/UiProvider'
import { ProductStatus } from '@/lib/prisma-enums'
import type { Product } from '@prisma/client'

export default function SupplierProductsPage() {
  const params = useParams<{ id: string }>()
  const supplierId = params.id as string
  const { language } = useUi()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyProducts()
  }, [supplierId])

  const fetchMyProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?mine=1&supplierId=${supplierId}`)
      const data = await res.json()
      if (data.success) setProducts(data.data)
    } catch {
      // error
    } finally {
      setLoading(false)
    }
  }

  const t = {
    ar: {
      title: 'منتجاتي',
      addNew: 'إضافة منتج جديد',
      noProducts: 'لا توجد منتجات بعد. أضف منتجك الأول!',
    },
    en: {
      title: 'My Products',
      addNew: 'Add New Product',
      noProducts: 'No products yet. Add your first product!',
    },
  }[language]

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link href={`/suppliers/${supplierId}/products/new`} className="btn-pro-primary">
          {t.addNew}
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center p-12 rounded-xl bg-gray-50">
          <p className="text-lg">{t.noProducts}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="card-pro p-4">
<CloudImage src={product.images[0]} alt={product.nameAr || product.name} width={300} height={250} className="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition-all duration-300" />
              <h3 className="font-semibold">{product.nameAr || product.name}</h3>
              <p className="text-sm text-muted mb-2">{formatSypAmount(product.price, language)}</p>
              <div className="flex gap-2 text-xs">
                <span>{product.quantity > 0 ? 'نفد' : `${product.quantity} متوفر`}</span>
                <span>⭐ {product.rating.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

