'use client'

import { useState, useEffect, useRef } from 'react'
import { getTranslations } from '@/lib/api'

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
    default: return 'bg-gray-100 text-gray-600'
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
    <div className="bg-white rounded-lg shadow">
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.transcript}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('segments')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'segments'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Segments
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-3 py-1 text-sm rounded-md transition ${
              viewMode === 'full'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Full Text
          </button>
        </div>
      </div>

      {/* Speaker legend */}
      {viewMode === 'segments' && speakers.length > 1 && (
        <div className="px-6 py-2 border-b bg-gray-50 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 mr-2">Speakers:</span>
          {speakers.map((speaker, i) => {
            const seg = segments.find(s => s.speaker === speaker)
            const gender = seg?.speaker_gender
            return (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full ${getGenderColor(gender)}`}
              >
                {speaker}
                {gender && gender !== 'unknown' && (
                  <span className="ml-1 opacity-70">({getGenderIndicator(gender)})</span>
                )}
              </span>
            )
          })}
        </div>
      )}

      {hasAudio && viewMode === 'segments' && (
        <div className="px-6 py-2 border-b bg-blue-50 text-xs text-blue-700">
          Click on any segment to jump to that point in the audio
        </div>
      )}

      <div className={`p-6 max-h-[600px] overflow-y-auto ${isRTL ? 'rtl' : ''}`}>
        {viewMode === 'segments' ? (
          <div className="space-y-3">
            {segments.map((segment, index) => {
              const isActive = index === activeSegmentIndex
              const isClickable = hasAudio && onSegmentClick
              const borderClass = isRTL
                ? (isActive ? 'border-r-4 border-blue-500' : 'border-r-4 border-transparent')
                : (isActive ? 'border-l-4 border-blue-500' : 'border-l-4 border-transparent')

              return (
                <div
                  key={index}
                  ref={isActive ? activeSegmentRef : null}
                  onClick={() => isClickable && onSegmentClick(segment)}
                  className={`flex gap-4 p-2 rounded-lg transition-all ${
                    isActive ? 'bg-blue-50' : isClickable ? 'hover:bg-gray-50 cursor-pointer' : ''
                  } ${borderClass} ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                >
                  <span className={`text-xs font-mono w-12 flex-shrink-0 pt-1 ${
                    isActive ? 'text-blue-600 font-semibold' : 'text-gray-400'
                  } ${isRTL ? 'text-left' : ''}`}>
                    {formatTime(segment.start)}
                  </span>
                  <div className="flex-1">
                    {segment.speaker && (
                      <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-sm font-semibold ${
                          isActive ? 'text-blue-700' : 'text-primary-600'
                        }`}>
                          {segment.speaker}
                        </span>
                        {segment.speaker_gender && segment.speaker_gender !== 'unknown' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getGenderColor(segment.speaker_gender)}`}>
                            {getGenderIndicator(segment.speaker_gender)}
                          </span>
                        )}
                      </div>
                    )}
                    <p className={`${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                      {segment.text}
                    </p>
                  </div>
                  {isClickable && (
                    <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`prose prose-gray max-w-none ${isRTL ? 'text-right' : ''}`}>
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {cleanedTranscript || segments.map(s => s.text).join(' ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
