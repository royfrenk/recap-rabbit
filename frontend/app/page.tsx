'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import FileUpload from '@/components/FileUpload'
import HeroSection from '@/components/HeroSection'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { uploadEpisode, processUrl, searchPodcasts, getPopularSearches, lookupPodcastByUrl, getPodcastEpisodes, isPodcastPlatformUrl, SearchResult, PodcastLookupResult } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Clock, Podcast, Calendar, ChevronLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DEFAULT_POPULAR_SEARCHES = [
  "Tim Ferriss productivity",
  "Huberman Lab sleep",
  "Lex Fridman AI",
  "Joe Rogan science",
]

// Format publish date like Apple Podcasts (e.g., "Jan 8", "12/25/2024", "7h ago")
function formatPublishDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    // Less than 24 hours ago
    if (diffHours < 24 && diffHours >= 0) {
      return `${diffHours}h ago`
    }

    // Same year - show "Jan 8" format
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    // Different year - show "12/25/2024" format
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
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

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [popularSearches, setPopularSearches] = useState<string[]>(DEFAULT_POPULAR_SEARCHES)
  const [viewingPodcast, setViewingPodcast] = useState<{ id: string; name: string; thumbnail?: string } | null>(null)

  // Fetch popular searches on mount
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const searches = await getPopularSearches()
        if (searches && searches.length > 0) {
          // Capitalize first letter of each word for display
          const formatted = searches.map((s: string) =>
            s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          )
          setPopularSearches(formatted)
        }
      } catch (error) {
        console.error('Failed to fetch popular searches:', error)
        // Keep default searches on error
      }
    }
    fetchPopular()
  }, [])

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setViewingPodcast(null)  // Clear any podcast view when doing a new search
    try {
      const results = await searchPodcasts(query)
      setSearchResults(results.results)
      setShowSearch(true)
    } catch (error) {
      console.error('Search failed:', error)
      alert('Search failed. Make sure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlSubmit = async (url: string) => {
    // Check if this is a podcast platform URL (like Apple Podcasts)
    if (isPodcastPlatformUrl(url)) {
      setIsLoading(true)
      try {
        const result = await lookupPodcastByUrl(url)
        if (result.results.length > 0) {
          setSearchResults(result.results)
          setViewingPodcast({
            id: result.podcast_id || '',
            name: result.podcast_name || 'Podcast',
            thumbnail: result.podcast_thumbnail
          })
          setShowSearch(true)
        } else {
          alert(result.message || 'Could not load podcast. Please try a different URL.')
        }
      } catch (error: any) {
        console.error('Podcast lookup failed:', error)
        alert('Failed to load podcast. Please try again.')
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Direct audio URL - requires authentication
    if (!user) {
      router.push('/login')
      return
    }
    setIsLoading(true)
    try {
      const result = await processUrl(url)
      router.push(`/episode/${result.id}`)
    } catch (error: any) {
      console.error('URL processing failed:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      } else {
        alert('Failed to process URL. Please try again.')
      }
      setIsLoading(false)
    }
  }

  const handleViewPodcast = async (podcastId: string, podcastName: string, thumbnail?: string) => {
    setIsLoading(true)
    try {
      const result = await getPodcastEpisodes(podcastId)
      setSearchResults(result.results)
      setViewingPodcast({ id: podcastId, name: podcastName, thumbnail })
      setShowSearch(true)
    } catch (error: any) {
      console.error('Failed to load podcast:', error)
      alert('Failed to load podcast episodes.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToSearch = () => {
    setViewingPodcast(null)
    setSearchResults([])
    setShowSearch(false)
  }

  const handleFileSelect = async (file: File) => {
    if (!user) {
      router.push('/login')
      return
    }
    setIsLoading(true)
    try {
      const result = await uploadEpisode(file)
      router.push(`/episode/${result.id}`)
    } catch (error: any) {
      console.error('Upload failed:', error)
      if (error.response?.status === 401) {
        router.push('/login')
      } else {
        alert('Failed to upload file. Please try again.')
      }
      setIsLoading(false)
    }
  }

  const handleEpisodeSelect = async (episode: SearchResult) => {
    if (!user) {
      router.push('/login')
      return
    }
    setIsLoading(true)
    try {
      const result = await processUrl(
        episode.audio_url,
        episode.title,
        episode.podcast_name,
        episode.description || undefined
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

  return (
    <div className="max-w-3xl mx-auto">
      <HeroSection />

      <div className="space-y-6">
        <SearchBar
          onSearch={handleSearch}
          onUrlSubmit={handleUrlSubmit}
          isLoading={isLoading}
        />

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Popular:</span>
          {popularSearches.map((query) => (
            <Badge
              key={query}
              variant="muted"
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => !isLoading && handleSearch(query)}
            >
              {query}
            </Badge>
          ))}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-background text-muted-foreground">or upload your own</span>
          </div>
        </div>

        <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
      </div>

      {/* Search Results */}
      {showSearch && searchResults.length > 0 && (
        <div className="mt-10">
          {/* Podcast View Header */}
          {viewingPodcast ? (
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToSearch}
                className="mb-4 -ml-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to search
              </Button>
              <div className="flex items-center gap-4">
                {viewingPodcast.thumbnail && (
                  <img
                    src={viewingPodcast.thumbnail}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h2 className="text-xl font-semibold">{viewingPodcast.name}</h2>
                  <p className="text-sm text-muted-foreground">{searchResults.length} episodes</p>
                </div>
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          )}

          <div className="space-y-3">
            {searchResults.map((episode) => {
              // Build preview URL with episode data
              const previewParams = new URLSearchParams({
                title: episode.title,
                podcast: episode.podcast_name,
                audio: episode.audio_url,
                ...(episode.thumbnail && { thumb: episode.thumbnail }),
                ...(episode.duration_seconds && { duration: String(episode.duration_seconds) }),
                ...(episode.publish_date && { date: episode.publish_date }),
                ...(episode.description && { desc: episode.description }),
                ...(episode.podcast_id && { podcastId: episode.podcast_id }),
              })
              const previewUrl = `/preview/${episode.id}?${previewParams.toString()}`

              return (
                <Card
                  key={episode.id}
                  className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                  onClick={() => router.push(previewUrl)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {episode.thumbnail && (
                        <img
                          src={episode.thumbnail}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground line-clamp-2">{episode.title}</h3>

                        {/* Podcast name - clickable to view all episodes */}
                        {!viewingPodcast && episode.podcast_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewPodcast(episode.podcast_id!, episode.podcast_name, episode.thumbnail || undefined)
                            }}
                            className="flex items-center gap-2 mt-1 text-sm text-primary hover:underline"
                          >
                            <Podcast className="h-3 w-3" />
                            {episode.podcast_name}
                          </button>
                        )}

                        {/* Date and duration row */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {episode.publish_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatPublishDate(episode.publish_date)}</span>
                            </div>
                          )}
                          {episode.duration_seconds && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(episode.duration_seconds)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Get Summary button */}
                      <div className="flex-shrink-0 self-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEpisodeSelect(episode)
                          }}
                          disabled={isLoading}
                          className="gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span className="hidden sm:inline">Get Summary</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {showSearch && searchResults.length === 0 && (
        <div className="mt-10 text-center text-muted-foreground">
          <p>No results found. Try a different search or paste a direct URL.</p>
        </div>
      )}
    </div>
  )
}
