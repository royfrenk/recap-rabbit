'use client'

import { useState, useEffect, useRef } from 'react'
import { getTranslations } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TranscriptSegment {
  start: number
  end: number
  text: string
  speaker: string | null
  speaker_label?: string
  speaker_gender?: string
}

interface TranscriptViewProps {
  segments: TranscriptSegment[]
  cleanedTranscript?: string
  currentTime?: number  // Current playback time for highlighting
  onSegmentClick?: (segment: TranscriptSegment) => void
  hasAudio?: boolean  // Whether audio player is available
  isRTL?: boolean  // Right-to-left language support
  languageCode?: string | null
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getGenderIndicator(gender?: string): string {
  switch (gender) {
    case 'male': return 'M'
    case 'female': return 'F'
    default: return ''
  }
}

function getGenderColor(gender?: string): string {
  switch (gender) {
    case 'male': return 'bg-blue-100 text-blue-700'
    case 'female': return 'bg-pink-100 text-pink-700'
    default: return 'bg-muted text-muted-foreground'
  }
}

export default function TranscriptView({
  segments,
  cleanedTranscript,
  currentTime,
  onSegmentClick,
  hasAudio = false,
  isRTL = false,
  languageCode
}: TranscriptViewProps) {
  const [viewMode, setViewMode] = useState<'segments' | 'full'>('segments')
  const activeSegmentRef = useRef<HTMLDivElement>(null)
  const t = getTranslations(languageCode)

  // Find the active segment based on current playback time
  const activeSegmentIndex = currentTime !== undefined
    ? segments.findIndex(seg => currentTime >= seg.start && currentTime < seg.end)
    : -1

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentIndex >= 0 && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [activeSegmentIndex])

  // Get unique speakers for legend
  const speakers = Array.from(new Set(segments.map(s => s.speaker).filter(Boolean)))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">{t.transcript}</CardTitle>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'segments' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('segments')}
          >
            Segments
          </Button>
          <Button
            variant={viewMode === 'full' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('full')}
          >
            Full Text
          </Button>
        </div>
      </CardHeader>

      {/* Speaker legend */}
      {viewMode === 'segments' && speakers.length > 1 && (
        <div className="px-6 py-2 border-t border-b bg-muted/50 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground mr-2">Speakers:</span>
          {speakers.map((speaker, i) => {
            const seg = segments.find(s => s.speaker === speaker)
            const gender = seg?.speaker_gender
            return (
              <Badge
                key={i}
                variant="outline"
                className={cn("text-xs", getGenderColor(gender))}
              >
                {speaker}
                {gender && gender !== 'unknown' && (
                  <span className="ml-1 opacity-70">({getGenderIndicator(gender)})</span>
                )}
              </Badge>
            )
          })}
        </div>
      )}

      {hasAudio && viewMode === 'segments' && (
        <div className="px-6 py-2 border-b bg-accent text-xs text-accent-foreground">
          Click on any segment to jump to that point in the audio
        </div>
      )}

      <CardContent className={cn("max-h-[600px] overflow-y-auto", isRTL && "rtl")}>
        {viewMode === 'segments' ? (
          <div className="space-y-3">
            {segments.map((segment, index) => {
              const isActive = index === activeSegmentIndex
              const isClickable = hasAudio && onSegmentClick

              return (
                <div
                  key={index}
                  ref={isActive ? activeSegmentRef : null}
                  onClick={() => isClickable && onSegmentClick(segment)}
                  className={cn(
                    "flex gap-4 p-3 rounded-lg transition-all group",
                    isActive ? 'bg-accent' : isClickable ? 'hover:bg-muted cursor-pointer' : '',
                    isRTL
                      ? (isActive ? 'border-r-4 border-primary' : 'border-r-4 border-transparent')
                      : (isActive ? 'border-l-4 border-primary' : 'border-l-4 border-transparent'),
                    isRTL && "flex-row-reverse text-right"
                  )}
                >
                  <span className={cn(
                    "text-xs font-mono w-12 flex-shrink-0 pt-1",
                    isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
                    isRTL && 'text-left'
                  )}>
                    {formatTime(segment.start)}
                  </span>
                  <div className="flex-1">
                    {segment.speaker && (
                      <div className={cn("flex items-center gap-2 mb-1", isRTL && "flex-row-reverse")}>
                        <span className={cn(
                          "text-sm font-semibold",
                          isActive ? 'text-primary' : 'text-primary/80'
                        )}>
                          {segment.speaker}
                        </span>
                        {segment.speaker_gender && segment.speaker_gender !== 'unknown' && (
                          <span className={cn("text-xs px-1.5 py-0.5 rounded", getGenderColor(segment.speaker_gender))}>
                            {getGenderIndicator(segment.speaker_gender)}
                          </span>
                        )}
                      </div>
                    )}
                    <p className={cn(isActive ? 'text-foreground' : 'text-muted-foreground')}>
                      {segment.text}
                    </p>
                  </div>
                  {isClickable && (
                    <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition">
                      <Play className="h-4 w-4" />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className={cn("prose prose-gray max-w-none", isRTL && "text-right")}>
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {cleanedTranscript || segments.map(s => s.text).join(' ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
