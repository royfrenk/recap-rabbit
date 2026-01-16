'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  onUrlSubmit: (url: string) => void
  isLoading?: boolean
}

export default function SearchBar({ onSearch, onUrlSubmit, isLoading }: SearchBarProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    if (input.startsWith('http://') || input.startsWith('https://')) {
      onUrlSubmit(input.trim())
    } else {
      onSearch(input.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search podcasts or paste an Apple Podcasts link..."
          className="h-14 pl-12 pr-24 text-lg rounded-xl border-2 focus-visible:ring-primary focus-visible:border-primary"
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-2 h-10 px-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            'Go'
          )}
        </Button>
      </div>
    </form>
  )
}
