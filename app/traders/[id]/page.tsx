import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

type TraderProfilePageProps = {
  params: { id: string }
}

export default async function TraderProfilePage({ params }: TraderProfilePageProps) {
  const trader = await prisma.trader.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true } },
    },
  })

  if (!trader) {
    notFound()
  }

  const title = trader.companyName || trader.user.name
  const subtitle = trader.companyName ? trader.user.name : null

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="card-pro space-y-2 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-app">{title}</h1>
        {subtitle ? <p className="text-muted">{subtitle}</p> : null}
        {trader.businessType ? (
          <p className="text-sm text-muted">{trader.businessType}</p>
        ) : null}
      </section>
    </div>
  )
}
