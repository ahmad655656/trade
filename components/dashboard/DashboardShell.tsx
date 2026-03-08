'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUi } from '@/components/providers/UiProvider'

type DashboardLink = {
  href: string
  label: { ar: string; en: string }
}

type DashboardShellProps = {
  title: { ar: string; en: string }
  subtitle: { ar: string; en: string }
  links: DashboardLink[]
  children: React.ReactNode
}

export default function DashboardShell({ title, subtitle, links, children }: DashboardShellProps) {
  const pathname = usePathname()
  const { language } = useUi()

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="card-pro h-fit p-4">
        <h1 className="text-lg font-semibold text-app">{title[language]}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle[language]}</p>

        <nav className="mt-4 space-y-2">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                pathname === item.href
                  ? 'bg-[color-mix(in_oklab,var(--app-primary)_14%,transparent)] text-app'
                  : 'text-muted hover:bg-[color-mix(in_oklab,var(--app-primary)_8%,transparent)] hover:text-app'
              }`}
            >
              {item.label[language]}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="space-y-4">{children}</section>
    </div>
  )
}
