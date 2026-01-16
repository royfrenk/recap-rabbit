'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getEpisodeHistory, resumeEpisode, EpisodeListItem } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Mic, Loader2, RotateCcw, Clock, Podcast } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'completed' | 'processing' | 'failed'

const statusStyles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  completed: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  failed: { variant: 'destructive' },
  pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  downloading: { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  transcribing: { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  diarizing: { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  cleaning: { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  summarizing: { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-200' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

export default function HistoryPage() {
  const router = useRouter()
  const [episodes, setEpisodes] = useState<EpisodeListItem[]>([])
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchEpisodes()
  }, [filter])

  const fetchEpisodes = async () => {
    setIsLoading(true)
    try {
      const data = await getEpisodeHistory(filter === 'all' ? undefined : filter)
      setEpisodes(data.episodes)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResume = async (e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation()
    try {
      await resumeEpisode(episodeId)
      router.push(`/episode/${episodeId}`)
    } catch (error) {
      console.error('Failed to resume episode:', error)
      alert('Failed to resume processing')
    }
  }

  const getStatusBadge = (status: string, progress: number) => {
    const style = statusStyles[status] || statusStyles.pending
    const isProcessing = !['completed', 'failed'].includes(status)

    return (
      <div className="flex items-center gap-2">
        {isProcessing && (
          <span className="text-xs text-muted-foreground">{progress}%</span>
        )}
        <Badge variant={style.variant} className={style.className}>
          {status}
        </Badge>
      </div>
    )
  }

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'processing', label: 'Processing' },
    { key: 'failed', label: 'Failed' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Processing History</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} episode{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => router.push('/')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Episode
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-4">
        {filterTabs.map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Episode List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      ) : episodes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Mic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No episodes found</p>
            <Button variant="link" onClick={() => router.push('/')}>
              Process your first episode
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {episodes.map((episode) => (
            <Card
              key={episode.id}
              onClick={() => router.push(`/episode/${episode.id}`)}
              className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {episode.title || 'Untitled Episode'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Podcast className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground truncate">
                        {episode.podcast_name || 'Unknown Podcast'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {episode.duration_seconds && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(episode.duration_seconds)}
                      </div>
                    )}
                    {getStatusBadge(episode.status, episode.progress)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(episode.created_at)}
                  </span>
                  {episode.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleResume(e, episode.id)}
                      className="gap-1 h-auto py-1 text-xs"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </Button>
                  )}
                  {!['completed', 'failed'].includes(episode.status) && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
