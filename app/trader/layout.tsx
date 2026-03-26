import { Role } from '@/lib/prisma-enums'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/session'

const traderLinks = [
  { href: '/trader', label: { ar: 'لوحة التاجر', en: 'Trader Dashboard' } },
  { href: '/trader/products', label: { ar: 'المنتجات', en: 'Products' } },
  { href: '/trader/cart', label: { ar: 'سلة التسوق', en: 'Cart' } },
  { href: '/trader/orders', label: { ar: 'طلباتي', en: 'My Orders' } },
  { href: '/trader/wishlist', label: { ar: 'المفضلة', en: 'Wishlist' } },
  { href: '/trader/suppliers', label: { ar: 'الموردون', en: 'Suppliers' } },
  { href: '/trader/wallet', label: { ar: 'المحفظة', en: 'Wallet' } },
  { href: '/trader/addresses', label: { ar: 'العناوين', en: 'Addresses' } },
  { href: '/trader/profile', label: { ar: 'الملف الشخصي', en: 'Profile' } },
  { href: '/trader/reviews', label: { ar: 'تقييماتي', en: 'My Reviews' } },
  { href: '/messages', label: { ar: 'مركز الرسائل', en: 'Message center' } },
]

export default async function TraderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole([Role.TRADER])
  if (user.status === 'PENDING_VERIFICATION') {
    redirect('/trader/verify')
  }

  return (
    <DashboardShell
      title={{ ar: 'مساحة التاجر', en: 'Trader Workspace' }}
      subtitle={{ ar: 'شراء وتتبع وإدارة الطلبات بالدفع اليدوي', en: 'Buy, track and manage manual-payment orders' }}
      links={traderLinks}
    >
      {children}
    </DashboardShell>
  )
}


