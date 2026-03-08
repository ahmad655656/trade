import type { Metadata } from 'next'
import { Cairo, Manrope } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/layout/Navbar'
import { UiProvider } from '@/components/providers/UiProvider'

const cairo = Cairo({ subsets: ['latin', 'arabic'], variable: '--font-arabic' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-latin' })

export const metadata: Metadata = {
  title: 'B2B Marketplace',
  description: 'Professional marketplace for admins, suppliers, and traders',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} ${manrope.variable} min-h-screen bg-app text-app antialiased`}>
        <UiProvider>
          <Navbar />
          <main className="container mx-auto px-4 py-8">{children}</main>
          <Toaster position="top-center" />
        </UiProvider>
      </body>
    </html>
  )
}

