import type { Metadata } from 'next'
import { Cairo, Manrope } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { UiProvider } from '@/components/providers/UiProvider'

const cairo = Cairo({ subsets: ['latin', 'arabic'], variable: '--font-arabic' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-latin' })

export const metadata: Metadata = {
  title: 'Premier B2B Trading Platform | Verified Suppliers Network',
  description: 'Connect with certified suppliers, streamline orders, and grow your business with secure, efficient B2B trading solutions.',
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
          <main className="container mx-auto px-4 py-8 min-h-[calc(100vh-200px)]">{children}</main>
          <Footer />
          <Toaster position="top-center" />
        </UiProvider>
      </body>
    </html>
  )
}

