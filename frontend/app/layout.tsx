import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import Header from '@/components/Header'
import { WebsiteSchema, OrganizationSchema } from '@/components/JsonLd'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recaprabbit.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Recap Rabbit - AI Podcast Summaries & Transcripts',
    template: '%s | Recap Rabbit',
  },
  description: 'Get AI-powered summaries, key takeaways, and transcripts from any podcast episode. Search millions of podcasts and get the insights without listening to the whole thing.',
  keywords: ['podcast summary', 'podcast transcript', 'podcast notes', 'AI podcast', 'podcast takeaways', 'podcast key points'],
  authors: [{ name: 'Recap Rabbit' }],
  creator: 'Recap Rabbit',
  publisher: 'Recap Rabbit',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Recap Rabbit',
    title: 'Recap Rabbit - AI Podcast Summaries & Transcripts',
    description: 'Get AI-powered summaries, key takeaways, and transcripts from any podcast episode.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Recap Rabbit - AI Podcast Summaries',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recap Rabbit - AI Podcast Summaries & Transcripts',
    description: 'Get AI-powered summaries, key takeaways, and transcripts from any podcast episode.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'Z85sXpYa55QoT_qR-P9LpuQc6AQfvGLhMxsqOqh5Vuw',
  },
  alternates: {
    canonical: siteUrl,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <WebsiteSchema url={siteUrl} name="Recap Rabbit" />
        <OrganizationSchema
          url={siteUrl}
          name="Recap Rabbit"
          logo={`${siteUrl}/logo-full.png`}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
