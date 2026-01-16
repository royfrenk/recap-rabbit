'use client'

import { Sparkles, Zap, Search, Headphones } from 'lucide-react'

export default function HeroSection() {
  return (
    <div className="text-center space-y-6 mb-12">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
        <Headphones className="h-4 w-4" />
        AI-Powered Podcast Intelligence
      </div>

      <h1 className="text-5xl md:text-6xl font-bold leading-tight">
        Find & Recap{" "}
        <span className="bg-gradient-to-r from-primary via-secondary to-secondary bg-clip-text text-transparent">
          Any Podcast
        </span>
        <br />
        in Seconds
      </h1>

      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Search for any episode, get AI-generated summaries with key takeaways and quotes—no listening required.
      </p>

      {/* Features */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <span>Smart Search</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span>AI Summaries</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-secondary/10 rounded-lg">
            <Zap className="h-4 w-4 text-secondary" />
          </div>
          <span>Instant Results</span>
        </div>
      </div>
    </div>
  )
}
