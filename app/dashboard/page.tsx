import { redirect } from 'next/navigation'
import { getRoleDashboardPath, requireUser } from '@/lib/session'

export default async function DashboardIndexPage() {
  const user = await requireUser()
  redirect(getRoleDashboardPath(user.role))
}
