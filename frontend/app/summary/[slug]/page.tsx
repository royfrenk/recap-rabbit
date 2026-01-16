import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Podcast, Quote, Lightbulb, FileText } from 'lucide-react'
import { ArticleSchema, BreadcrumbSchema } from '@/components/JsonLd'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://recaprabbit.com'

interface PublicSummary {
  slug: string
  title: string | null
  podcast_name: string | null
  description: string | null
  summary: {
    paragraph: string
    takeaways: string[]
    key_quotes: { text: string; speaker: string | null }[]
  } | null
  duration_seconds: number | null
  language_code: string | null
  created_at: string | null
}

async function getSummary(slug: string): Promise<PublicSummary | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/summary/${slug}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const summary = await getSummary(params.slug)

  if (!summary) {
    return {
      title: 'Summary Not Found',
    }
  }

  const title = `${summary.title} - Summary | Recap Rabbit`
  const description = summary.summary?.paragraph?.slice(0, 160) ||
    `AI-generated summary of ${summary.title} from ${summary.podcast_name}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_URL}/summary/${params.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/summary/${params.slug}`,
    },
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0) return `${hours} hr ${minutes} min`
  return `${minutes} min`
}

export default async function PublicSummaryPage({ params }: { params: { slug: string } }) {
  const summary = await getSummary(params.slug)

  if (!summary || !summary.summary) {
    notFound()
  }

  const pageUrl = `${SITE_URL}/summary/${params.slug}`

  return (
    <div className="max-w-3xl mx-auto">
      {/* Schema markup */}
      <ArticleSchema
        headline={summary.title || 'Podcast Summary'}
        description={summary.summary.paragraph.slice(0, 160)}
        url={pageUrl}
        datePublished={summary.created_at || new Date().toISOString()}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: SITE_URL },
          { name: summary.podcast_name || 'Podcast', url: SITE_URL },
          { name: summary.title || 'Summary', url: pageUrl },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Podcast className="h-4 w-4" />
          <span className="font-medium">{summary.podcast_name}</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">{summary.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {summary.duration_seconds && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(summary.duration_seconds)}</span>
            </div>
          )}
          <Badge variant="secondary">AI Summary</Badge>
        </div>
      </div>

      {/* Summary Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">{summary.summary.paragraph}</p>
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      {summary.summary.takeaways.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.summary.takeaways.map((takeaway, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-foreground">{takeaway}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Key Quotes */}
      {summary.summary.key_quotes.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Quote className="h-5 w-5 text-primary" />
              Key Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.summary.key_quotes.map((quote, index) => (
                <blockquote key={index} className="border-l-4 border-primary pl-4 py-2 bg-accent/50 rounded-r-lg">
                  <p className="text-foreground italic">&ldquo;{quote.text}&rdquo;</p>
                  {quote.speaker && (
                    <footer className="text-sm text-muted-foreground mt-2">— {quote.speaker}</footer>
                  )}
                </blockquote>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Get summaries of any podcast episode</h2>
          <p className="text-muted-foreground mb-4">
            Search millions of podcasts and get AI-powered summaries, key takeaways, and transcripts.
          </p>
          <Button asChild size="lg">
            <Link href="/">Try Recap Rabbit Free</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        Generated by <Link href="/" className="text-primary hover:underline">Recap Rabbit</Link> - AI Podcast Summaries
      </p>
    </div>
  )
}
