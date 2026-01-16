'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import FileUpload from '@/components/FileUpload'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { uploadEpisode, processUrl, searchPodcasts, getPopularSearches, SearchResult } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Clock, Podcast } from 'lucide-react'

const DEFAULT_POPULAR_SEARCHES = [
  "Tim Ferriss productivity",
  "Huberman Lab sleep",
  "Lex Fridman AI",
  "Joe Rogan science",
]

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [popularSearches, setPopularSearches] = useState<string[]>(DEFAULT_POPULAR_SEARCHES)

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
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Get the <span className="text-primary">&ldquo;So What&rdquo;</span> of Any Podcast
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transcribe and summarize any podcast episode. Get key takeaways and quotes without listening to the whole thing.
        </p>
      </div>

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
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <div className="space-y-3">
            {searchResults.map((episode) => (
              <Card
                key={episode.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => !isLoading && handleEpisodeSelect(episode)}
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
                      <h3 className="font-medium text-foreground truncate">{episode.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Podcast className="h-3 w-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{episode.podcast_name}</p>
                      </div>
                      {episode.duration_seconds && (
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(episode.duration_seconds / 60)} min
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
