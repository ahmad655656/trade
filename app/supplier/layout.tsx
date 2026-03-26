import { Role } from '@/lib/prisma-enums'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/session'

const supplierLinks = [
  { href: '/supplier', label: { ar: 'لوحة المورد', en: 'Supplier Dashboard' } },
  { href: '/supplier/products', label: { ar: 'المنتجات', en: 'Products' } },
  { href: '/supplier/products/new', label: { ar: 'إضافة منتج', en: 'Add Product' } },
  { href: '/supplier/orders', label: { ar: 'الطلبات', en: 'Orders' } },
  { href: '/supplier/shipping-methods', label: { ar: 'طرق الشحن', en: 'Shipping methods' } },
  { href: '/supplier/wallet', label: { ar: 'المحفظة', en: 'Wallet' } },
  { href: '/supplier/reviews', label: { ar: 'التقييمات', en: 'Reviews' } },
  { href: '/supplier/profile', label: { ar: 'الملف التجاري', en: 'Business profile' } },
  { href: '/messages', label: { ar: 'مركز الرسائل', en: 'Message center' } },
]

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.SUPPLIER])

  return (
    <DashboardShell
      title={{ ar: 'مساحة المورد', en: 'Supplier Workspace' }}
      subtitle={{ ar: 'إدارة المبيعات والطلبات والمنتجات', en: 'Manage sales, orders, and products' }}
      links={supplierLinks}
    >
      {children}
    </DashboardShell>
  )
}
