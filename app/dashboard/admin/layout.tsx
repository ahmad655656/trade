import { Role } from '@/lib/prisma-enums'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/session'

const adminLinks = [
  { href: '/dashboard/admin', label: { ar: 'اللوحة الرئيسية', en: 'Main dashboard' } },
  { href: '/dashboard/admin/users', label: { ar: 'إدارة المستخدمين', en: 'Users management' } },
  { href: '/dashboard/admin/suppliers', label: { ar: 'توثيق الموردين', en: 'Supplier verification' } },
  { href: '/dashboard/admin/orders', label: { ar: 'إدارة الطلبات', en: 'Orders management' } },
  { href: '/dashboard/admin/payments', label: { ar: 'إدارة المدفوعات', en: 'Payments management' } },
  { href: '/dashboard/admin/disputes', label: { ar: 'إدارة النزاعات', en: 'Dispute management' } },
  { href: '/dashboard/admin/commissions', label: { ar: 'إدارة العمولات', en: 'Commission management' } },
  { href: '/dashboard/admin/audit', label: { ar: 'سجل التدقيق', en: 'Audit logs' } },
  { href: '/dashboard/admin/security', label: { ar: 'أحداث الأمان', en: 'Security events' } },
  { href: '/dashboard/admin/reports', label: { ar: 'التقارير المالية', en: 'Financial reports' } },
  { href: '/dashboard/admin/categories', label: { ar: 'إدارة التصنيفات', en: 'Categories management' } },
  { href: '/dashboard/admin/settings', label: { ar: 'إعدادات المنصة', en: 'Platform settings' } },
  { href: '/messages', label: { ar: 'مركز الرسائل', en: 'Message center' } },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole([Role.ADMIN])

  return (
    <DashboardShell
      title={{ ar: 'لوحة المدير', en: 'Admin Console' }}
      subtitle={{ ar: 'إدارة كاملة لسوق المنصة', en: 'Manage the full marketplace' }}
      links={adminLinks}
    >
      {children}
    </DashboardShell>
  )
}


