import { Role } from '@/lib/prisma-enums'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/session'
import { redirect } from 'next/navigation'

const traderLinks = [
  { href: '/trader', label: { ar: '���� ������', en: 'Trader Dashboard' } },
  { href: '/trader/products', label: { ar: '��������', en: 'Products' } },
  { href: '/trader/cart', label: { ar: '��� ������', en: 'Cart' } },
  { href: '/trader/orders', label: { ar: '������', en: 'My Orders' } },
  { href: '/trader/wishlist', label: { ar: '�������', en: 'Wishlist' } },
  { href: '/trader/suppliers', label: { ar: '��������', en: 'Suppliers' } },
  { href: '/trader/wallet', label: { ar: '�������', en: 'Wallet' } },
  { href: '/trader/addresses', label: { ar: '��������', en: 'Addresses' } },
  { href: '/trader/profile', label: { ar: '����� ������', en: 'Profile' } },
  { href: '/trader/reviews', label: { ar: '��������', en: 'My Reviews' } },
  { href: '/messages', label: { ar: '���� �������', en: 'Message center' } },
]

export default async function TraderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole([Role.TRADER])
  if (user.status === 'PENDING_VERIFICATION') {
    redirect('/trader/verify')
  }

  return (
    <DashboardShell
      title={{ ar: '����� ������', en: 'Trader Workspace' }}
      subtitle={{ ar: '���� ����� ������ ������� ������ ������', en: 'Buy, track and manage manual-payment orders' }}
      links={traderLinks}
    >
      {children}
    </DashboardShell>
  )
}



