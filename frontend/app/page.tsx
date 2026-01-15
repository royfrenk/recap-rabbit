'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import FileUpload from '@/components/FileUpload'
import { uploadEpisode, processUrl, searchPodcasts, SearchResult } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)

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
    setIsLoading(true)
    try {
      const result = await processUrl(url)
      router.push(`/episode/${result.id}`)
    } catch (error) {
      console.error('URL processing failed:', error)
      alert('Failed to process URL. Make sure the backend is running.')
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    try {
      const result = await uploadEpisode(file)
      router.push(`/episode/${result.id}`)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload file. Make sure the backend is running.')
      setIsLoading(false)
    }
  }

  const handleEpisodeSelect = async (episode: SearchResult) => {
    setIsLoading(true)
    try {
      const result = await processUrl(
        episode.audio_url,
        episode.title,
        episode.podcast_name,
        episode.description || undefined
      )
      router.push(`/episode/${result.id}`)
    } catch (error) {
      console.error('Processing failed:', error)
      alert('Failed to process episode. Make sure the backend is running.')
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Get the &ldquo;So What&rdquo; of Any Podcast
        </h1>
        <p className="text-lg text-gray-600">
          Transcribe and summarize any podcast episode. Get key takeaways and quotes without listening to the whole thing.
        </p>
      </div>

      <div className="space-y-6">
        <SearchBar
          onSearch={handleSearch}
          onUrlSubmit={handleUrlSubmit}
          isLoading={isLoading}
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">or upload your own</span>
          </div>
        </div>

        <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
      </div>

      {showSearch && searchResults.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h2>
          <div className="space-y-4">
            {searchResults.map((episode) => (
              <button
                key={episode.id}
                onClick={() => handleEpisodeSelect(episode)}
                disabled={isLoading}
                className="w-full text-left bg-white rounded-lg shadow p-4 hover:shadow-md transition disabled:opacity-50"
              >
                <div className="flex gap-4">
                  {episode.thumbnail && (
                    <img
                      src={episode.thumbnail}
                      alt=""
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{episode.title}</h3>
                    <p className="text-sm text-gray-500">{episode.podcast_name}</p>
                    {episode.duration_seconds && (
                      <p className="text-xs text-gray-400 mt-1">
                        {Math.round(episode.duration_seconds / 60)} min
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showSearch && searchResults.length === 0 && (
        <div className="mt-8 text-center text-gray-500">
          <p>No results found. Try a different search or paste a direct URL.</p>
        </div>
      )}
    </div>
  )
}
