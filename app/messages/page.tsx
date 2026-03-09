import MessagesWorkspace from '@/components/messages/MessagesWorkspace'
import { requireUser } from '@/lib/session'

export default async function MessagesPage() {
  const user = await requireUser()

  return (
    <MessagesWorkspace
      currentUser={{
        id: user.id,
        name: user.name,
        role: user.role,
      }}
    />
  )
}
