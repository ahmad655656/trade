import { redirect } from 'next/navigation'

export default function TraderSuppliersPage() {
  // Legacy route support: redirect traders to the public suppliers listing.
  redirect('/suppliers')
}
