import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Recap Rabbit - Podcast Summaries',
  description: 'Get the key takeaways from any podcast episode without listening to the whole thing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-3xl">🐰</span>
                <span className="text-xl font-bold text-gray-900">Recap Rabbit</span>
              </a>
              <nav className="flex items-center gap-6">
                <a href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                  Home
                </a>
                <a href="/history" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                  History
                </a>
                <a href="/usage" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                  Usage
                </a>
              </nav>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
