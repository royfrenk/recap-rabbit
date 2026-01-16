'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { processUrl } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ArrowLeft, Clock, Calendar, Podcast, Sparkles, Loader2 } from 'lucide-react'
import { PodcastEpisodeSchema } from '@/components/JsonLd'

// Format publish date like Apple Podcasts
function formatPublishDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

// Format duration like "1 hr 31 min" or "45 min"
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours} hr ${minutes} min`
  }
  return `${minutes} min`
}

export default function EpisodePreviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Get episode data from URL params
  const title = searchParams.get('title') || 'Unknown Episode'
  const podcastName = searchParams.get('podcast') || 'Unknown Podcast'
  const audioUrl = searchParams.get('audio') || ''
  const thumbnail = searchParams.get('thumb')
  const durationSeconds = searchParams.get('duration') ? parseInt(searchParams.get('duration')!) : null
  const publishDate = searchParams.get('date')
  const description = searchParams.get('desc')
  const podcastId = searchParams.get('podcastId')

  const handleGetSummary = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!audioUrl) {
      alert('No audio URL available for this episode.')
      return
    }

    setIsLoading(true)
    try {
      const result = await processUrl(
        audioUrl,
        title,
        podcastName,
        description || undefined
      )
      router.push(`/episode/${result.id}`)
    } catch (error: any) {
      console.error('Processing failed:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      } else {
        alert('Failed to process episode. Please try again.')
      }
      setIsLoading(false)
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://recaprabbit.com'
  const pageUrl = `${siteUrl}/preview/${params.id}`

  return (
    <div className="max-w-3xl mx-auto">
      <PodcastEpisodeSchema
        name={title}
        description={description || `Listen to ${title} from ${podcastName}`}
        url={pageUrl}
        datePublished={publishDate || undefined}
        duration={durationSeconds || undefined}
        podcastName={podcastName}
        image={thumbnail || undefined}
      />

      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="gap-2 mb-6 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Button>

      <Card>
        <CardContent className="p-6">
          {/* Header with artwork and basic info */}
          <div className="flex flex-col sm:flex-row gap-6">
            {thumbnail && (
              <img
                src={thumbnail}
                alt={title}
                className="w-full sm:w-48 h-48 rounded-xl object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>

              <div className="flex items-center gap-2 text-primary mb-4">
                <Podcast className="h-4 w-4" />
                <span className="font-medium">{podcastName}</span>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                {publishDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatPublishDate(publishDate)}</span>
                  </div>
                )}
                {durationSeconds && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(durationSeconds)}</span>
                  </div>
                )}
              </div>

              {/* Get Summary button */}
              <Button
                size="lg"
                onClick={handleGetSummary}
                disabled={isLoading || !audioUrl}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get Summary
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="mt-8 pt-6 border-t">
              <h2 className="text-lg font-semibold mb-3">Episode Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
