'use client'

import type { CategoryStat, SalesPoint } from '@/types/supplier'

export function SupplierLineChart({ data }: { data: SalesPoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const points = data
    .map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100
      const y = 100 - (point.value / max) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 100 100" className="h-44 w-full rounded-xl bg-[color-mix(in_oklab,var(--app-primary)_6%,transparent)] p-2">
        <polyline fill="none" stroke="var(--app-primary)" strokeWidth="2" points={points} />
        {data.map((point, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * 100
          const y = 100 - (point.value / max) * 100
          return <circle key={point.label} cx={x} cy={y} r="1.8" fill="var(--app-primary-strong)" />
        })}
      </svg>
      <div className="flex justify-between gap-2 text-xs text-muted">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  )
}

export function SupplierDonutChart({ data }: { data: CategoryStat[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1
  const colors = ['#0a66ff', '#13b981', '#f97316', '#ef4444', '#8b5cf6']

  const segments = data.reduce<Array<{
    key: string
    d: string
    color: string
    value: number
    label: string
    from: { x: number; y: number }
  }>>((acc, item, index) => {
    const previousValue = acc.reduce((sum, segment) => sum + segment.value, 0)
    const start = previousValue / total
    const end = (previousValue + item.value) / total
    const largeArc = end - start > 0.5 ? 1 : 0

    const x1 = 50 + 40 * Math.cos(2 * Math.PI * start - Math.PI / 2)
    const y1 = 50 + 40 * Math.sin(2 * Math.PI * start - Math.PI / 2)
    const x2 = 50 + 40 * Math.cos(2 * Math.PI * end - Math.PI / 2)
    const y2 = 50 + 40 * Math.sin(2 * Math.PI * end - Math.PI / 2)

    return [
      ...acc,
      {
        key: item.label,
        d: `M 50 10 A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
        color: colors[index % colors.length],
        value: item.value,
        label: item.label,
        from: { x: x1, y: y1 },
      },
    ]
  }, [])

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <svg viewBox="0 0 100 100" className="h-44 w-44 shrink-0">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--app-border)" strokeWidth="14" />
        {segments.map((segment) => (
          <path key={segment.key} d={segment.d} fill="none" stroke={segment.color} strokeWidth="14" strokeLinecap="round" />
        ))}
        <circle cx="50" cy="50" r="24" fill="var(--app-surface)" />
      </svg>
      <div className="space-y-2 text-sm">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2 text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
            <span className="font-semibold text-app">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SupplierHorizontalBars({ data }: { data: CategoryStat[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-app">{item.label}</span>
            <span className="text-muted">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-[color-mix(in_oklab,var(--app-border)_70%,transparent)]">
            <div
              className="h-2 rounded-full bg-[linear-gradient(90deg,var(--app-primary),var(--app-primary-strong))]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
