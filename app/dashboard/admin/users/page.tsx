'use client'

import { useUi } from '@/components/providers/UiProvider'

export default function AdminUsersPage() {
  const { language } = useUi()
  const content = {
    ar: {
      title: 'إدارة المستخدمين',
      description: 'اعتماد الحسابات أو تعليقها أو حظرها من هذه الصفحة.',
    },
    en: {
      title: 'Users Management',
      description: 'Approve, suspend, and ban accounts from this page.',
    },
  }

  return (
    <section className="card-pro rounded-xl p-6">
      <h2 className="text-xl font-semibold text-app">{content[language].title}</h2>
      <p className="mt-2 text-muted">{content[language].description}</p>
    </section>
  )
}
