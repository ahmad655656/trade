'use client'

export default function SupplierSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card-pro animate-pulse rounded-xl p-4">
      <div className="h-6 w-40 rounded bg-[color-mix(in_oklab,var(--app-border)_80%,transparent)]" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-10 rounded bg-[color-mix(in_oklab,var(--app-border)_65%,transparent)]" />
        ))}
      </div>
    </div>
  )
}
