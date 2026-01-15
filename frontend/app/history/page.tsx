'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getEpisodeHistory, resumeEpisode, EpisodeListItem } from '@/lib/api'

type StatusFilter = 'all' | 'completed' | 'processing' | 'failed'

const statusStyles: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  downloading: 'bg-blue-100 text-blue-800',
  transcribing: 'bg-blue-100 text-blue-800',
  diarizing: 'bg-blue-100 text-blue-800',
  cleaning: 'bg-blue-100 text-blue-800',
  summarizing: 'bg-blue-100 text-blue-800',
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
          <span className="text-xs text-gray-500">{progress}%</span>
        )}
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${style}`}>
          {status}
        </span>
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
          <h1 className="text-2xl font-bold text-gray-900">Processing History</h1>
          <p className="text-sm text-gray-500 mt-1">{total} episode{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Episode
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === key
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Episode List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      ) : episodes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-gray-500 mb-4">No episodes found</p>
          <button
            onClick={() => router.push('/')}
            className="text-primary-600 hover:underline font-medium"
          >
            Process your first episode
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map((episode) => (
            <div
              key={episode.id}
              onClick={() => router.push(`/episode/${episode.id}`)}
              className="bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {episode.title || 'Untitled Episode'}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {episode.podcast_name || 'Unknown Podcast'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {episode.duration_seconds && (
                      <span className="text-sm text-gray-400">
                        {formatDuration(episode.duration_seconds)}
                      </span>
                    )}
                    {getStatusBadge(episode.status, episode.progress)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {formatDate(episode.created_at)}
                  </span>
                  {episode.status === 'failed' && (
                    <button
                      onClick={(e) => handleResume(e, episode.id)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Retry
                    </button>
                  )}
                  {!['completed', 'failed'].includes(episode.status) && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
