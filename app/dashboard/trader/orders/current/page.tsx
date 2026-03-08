import { redirect } from 'next/navigation'

export default function LegacyTraderOrdersCurrentRedirect() {
  redirect('/trader/orders')
}
