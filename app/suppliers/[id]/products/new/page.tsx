'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function NewProductPage() {
  const params = useParams<{ id: string }>()
  const supplierId = params.id as string
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    price: '',
    quantity: '',
    minOrderQuantity: '1',
    categoryId: '',
    tags: '',
    sku: '',
  })

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setImages(prev => {
      const remaining = Math.max(0, 5 - prev.length)
      const nextFiles = files.slice(0, remaining)
      if (!nextFiles.length) return prev

      setImagePreviews(prevPreviews => [
        ...prevPreviews,
        ...nextFiles.map(file => URL.createObjectURL(file)),
      ])

      return [...prev, ...nextFiles]
    })
  }, [])

  const handleRemoveImage = (index: number) => {
    const preview = imagePreviews[index]
    if (preview) URL.revokeObjectURL(preview)
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || images.length === 0) return

    setLoading(true)
    const formDataToSend = new FormData()
    formDataToSend.append('supplierId', supplierId)
    formDataToSend.append('nameAr', formData.nameAr)
    formDataToSend.append('nameEn', formData.nameEn || formData.nameAr)
    formDataToSend.append('descriptionAr', formData.descriptionAr)
    formDataToSend.append('price', formData.price)
    formDataToSend.append('quantity', formData.quantity)
    formDataToSend.append('minOrderQuantity', formData.minOrderQuantity)
    // Add more fields

    images.forEach((file) => {
      formDataToSend.append('images', file)
    })

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        body: formDataToSend,
      })
      if (res.ok) {
        router.push(`/suppliers/${supplierId}/products`)
      }
    } catch {
      // error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted hover:text-app text-xl">
            ←
          </button>
          <h1 className="text-2xl font-bold text-app">إضافة منتج جديد</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-xl border">
          {/* Images - TOP PRIORITY */}
          <div className="border-b pb-6">
            <label htmlFor="product-images" className="block text-lg font-bold mb-4 text-app flex items-center gap-2">
              📸 صور المنتج <span className="text-red-500 text-sm font-normal">(1-5 صور مطلوبة)</span>
            </label>
            <input
              id="product-images"
              name="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="w-full file:mr-6 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-base file:font-bold file:bg-gradient-to-r file:from-primary file:to-blue-600 file:text-white hover:file:from-primary/90 hover:file:to-blue-500 cursor-pointer transition-all block mb-4 p-4 border-2 border-dashed border-gray-300 rounded-2xl hover:border-primary/50 hover:bg-gray-50"
            />
            <p className="text-sm text-muted mb-6">الحد الأقصى 5 صور، 10 ميغا بايت لكل صورة. صيغ مدعومة: JPG, PNG, WEBP, HEIC</p>
            <p className="text-xs text-muted mb-6">سيتم رفع الصور إلى Cloudinary عند حفظ المنتج.</p>
            {imagePreviews.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative group cursor-pointer">
                    <img 
                      src={preview} 
                      alt={`معاينة ${i + 1}`} 
                      className="w-full h-28 object-cover rounded-xl shadow-md hover:shadow-lg transition-shadow" 
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold opacity-0 group-hover:opacity-100 transition-all shadow-lg border-2 border-white"
                      title="حذف الصورة"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-dashed-primary rounded-2xl p-12 text-center bg-gradient-to-br from-gray-50 to-white">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-lg font-semibold text-muted mb-1">لا توجد صور مرسلة</p>
                <p className="text-sm text-gray-500">انقر على الزر أعلاه لاختيار صور المنتج (مطلوب)</p>
              </div>
            )}
          </div>

          {/* Other fields */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">اسم المنتج (عربي) *</label>
              <input 
                value={formData.nameAr} 
                onChange={(e) => setFormData(p => ({...p, nameAr: e.target.value}))} 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Product Name (English)</label>
              <input 
                value={formData.nameEn} 
                onChange={(e) => setFormData(p => ({...p, nameEn: e.target.value}))} 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">السعر (ل.س) *</label>
              <input 
                type="number" 
                value={formData.price} 
                onChange={(e) => setFormData(p => ({...p, price: e.target.value}))} 
                min="0" 
                step="0.01"
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">الكمية المتاحة *</label>
              <input 
                type="number" 
                value={formData.quantity} 
                onChange={(e) => setFormData(p => ({...p, quantity: e.target.value}))} 
                min="0"
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">أقل كمية للطلب</label>
              <input 
                type="number" 
                min="1" 
                value={formData.minOrderQuantity} 
                onChange={(e) => setFormData(p => ({...p, minOrderQuantity: e.target.value}))} 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || images.length === 0} 
            className="w-full bg-gradient-to-r from-primary to-blue-600 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:from-primary/90 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="opacity-25" />
                  <path d="M12 12 4 12a8 8 0 0 1 8-8V0A10 10 0 0 0 2 12h10Z" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength="0.75" className="opacity-75" />
                </svg>
                جاري رفع المنتج والصور...
              </>
            ) : (
              '📤 رفع المنتج ورفع الصور إلى السحابة'
            )}
          </button>
        </form>
      </div>
    </div>
  )

}

