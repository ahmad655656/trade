import { redirect } from 'next/navigation'

export default function LegacyTraderOrdersHistoryRedirect() {
  redirect('/trader/orders')
}
