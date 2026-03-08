import { Role } from '@prisma/client'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/session'

const supplierLinks = [
  { href: '/dashboard/supplier', label: { ar: 'اللوحة الرئيسية', en: 'Main dashboard' } },
  { href: '/dashboard/supplier/products', label: { ar: 'إدارة المنتجات', en: 'Products management' } },
  { href: '/dashboard/supplier/inventory', label: { ar: 'المخزون', en: 'Inventory' } },
  { href: '/dashboard/supplier/orders', label: { ar: 'الطلبات الواردة', en: 'Incoming orders' } },
  { href: '/dashboard/supplier/sales', label: { ar: 'تقارير المبيعات', en: 'Sales reports' } },
  { href: '/dashboard/supplier/reviews', label: { ar: 'التقييمات والمراجعات', en: 'Ratings and reviews' } },
  { href: '/dashboard/supplier/settings', label: { ar: 'إعدادات المتجر', en: 'Store settings' } },
  { href: '/dashboard/supplier/wallet', label: { ar: 'المحفظة', en: 'Wallet' } },
]

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.SUPPLIER])

  return (
    <DashboardShell
      title={{ ar: 'لوحة المورد', en: 'Supplier Console' }}
      subtitle={{ ar: 'إدارة المتجر والطلبات باحتراف', en: 'Operate your store and orders' }}
      links={supplierLinks}
    >
      {children}
    </DashboardShell>
  )
}
