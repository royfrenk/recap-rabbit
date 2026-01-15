'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ProcessingStatus from '@/components/ProcessingStatus'
import SummaryCard from '@/components/SummaryCard'
import KeyQuotes from '@/components/KeyQuotes'
import TranscriptView from '@/components/TranscriptView'
import ExportModal from '@/components/ExportModal'
import AudioPlayer, { AudioPlayerRef } from '@/components/AudioPlayer'
import SpeakerOverridePanel from '@/components/SpeakerOverridePanel'
import { getEpisode, getEpisodeStatus, EpisodeResult, TranscriptSegment, RTL_LANGUAGES } from '@/lib/api'

export default function EpisodePage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const audioPlayerRef = useRef<AudioPlayerRef>(null)
  const [episode, setEpisode] = useState<EpisodeResult | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary')
  const [showExportModal, setShowExportModal] = useState(false)
  const [showSpeakerPanel, setShowSpeakerPanel] = useState(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0)
  const [showEnglish, setShowEnglish] = useState(false)  // Toggle for bilingual content

  useEffect(() => {
    let interval: NodeJS.Timeout

    const fetchStatus = async () => {
      try {
        const status = await getEpisodeStatus(id)

        if (status.status === 'completed' || status.status === 'failed') {
          const fullEpisode = await getEpisode(id)
          setEpisode(fullEpisode)
          clearInterval(interval)
        } else {
          setEpisode((prev) => ({
            ...prev!,
            id,
            status: status.status as EpisodeResult['status'],
            progress: status.progress,
            error: status.error,
            status_message: status.status_message,
            duration_seconds: status.duration_seconds,
          }))
        }
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }

    fetchStatus()
    interval = setInterval(fetchStatus, 2000)

    return () => clearInterval(interval)
  }, [id])

  const handleSegmentClick = (segment: TranscriptSegment) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(segment.start)
      audioPlayerRef.current.play()
    }
  }

  const handleSpeakersUpdated = async () => {
    // Refresh episode data to get updated speaker names
    try {
      const fullEpisode = await getEpisode(id)
      setEpisode(fullEpisode)
    } catch (error) {
      console.error('Failed to refresh episode:', error)
    }
  }

  if (!episode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  const isProcessing = !['completed', 'failed'].includes(episode.status)
  const hasAudio = !!episode.audio_url
  const isRTL = episode.language_code ? RTL_LANGUAGES.has(episode.language_code) : false
  const hasBilingualContent = !!(episode.summary?.paragraph_en && episode.summary?.takeaways_en)

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </button>

      {episode.title && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{episode.title}</h1>
          {episode.podcast_name && (
            <p className="text-gray-600">{episode.podcast_name}</p>
          )}
          {episode.duration_seconds && (
            <p className="text-sm text-gray-400 mt-1">
              {Math.round(episode.duration_seconds / 60)} minutes
            </p>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="bg-white rounded-lg shadow p-8">
          <ProcessingStatus
            status={episode.status}
            progress={episode.progress}
            error={episode.error}
            statusMessage={episode.status_message}
            durationSeconds={episode.duration_seconds}
          />
        </div>
      )}

      {episode.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Processing Failed</h2>
          <p className="text-red-600">{episode.error || 'An unknown error occurred'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition"
          >
            Try Again
          </button>
        </div>
      )}

      {episode.status === 'completed' && episode.summary && (
        <>
          {/* Audio Player */}
          {hasAudio && (
            <div className="mb-6">
              <AudioPlayer
                ref={audioPlayerRef}
                audioUrl={episode.audio_url!}
                onTimeUpdate={setCurrentPlaybackTime}
              />
            </div>
          )}

          <div className="border-b border-gray-200 mb-6">
            <div className="flex items-center justify-between">
              <nav className="flex gap-8">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'summary'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`pb-4 text-sm font-medium border-b-2 transition ${
                    activeTab === 'transcript'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Full Transcript
                </button>
              </nav>
              <div className="flex items-center gap-2">
                {episode.transcript && (
                  <button
                    onClick={() => setShowSpeakerPanel(true)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition text-sm font-medium"
                    title="Edit speaker names"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Edit Speakers
                  </button>
                )}
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Language Toggle for bilingual content */}
              {hasBilingualContent && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-gray-500">Language:</span>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setShowEnglish(false)}
                      className={`px-3 py-1 text-sm rounded-md transition ${
                        !showEnglish
                          ? 'bg-white shadow text-gray-900'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setShowEnglish(true)}
                      className={`px-3 py-1 text-sm rounded-md transition ${
                        showEnglish
                          ? 'bg-white shadow text-gray-900'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>
              )}
              <SummaryCard
                paragraph={showEnglish && episode.summary.paragraph_en
                  ? episode.summary.paragraph_en
                  : episode.summary.paragraph}
                takeaways={showEnglish && episode.summary.takeaways_en
                  ? episode.summary.takeaways_en
                  : episode.summary.takeaways}
                isRTL={!showEnglish && isRTL}
                languageCode={showEnglish ? 'en' : episode.language_code}
              />
              <KeyQuotes quotes={episode.summary.key_quotes} isRTL={isRTL} languageCode={episode.language_code} />
            </div>
          )}

          {activeTab === 'transcript' && episode.transcript && (
            <TranscriptView
              segments={episode.transcript}
              cleanedTranscript={episode.cleaned_transcript || undefined}
              currentTime={hasAudio ? currentPlaybackTime : undefined}
              onSegmentClick={hasAudio ? handleSegmentClick : undefined}
              hasAudio={hasAudio}
              isRTL={isRTL}
              languageCode={episode.language_code}
            />
          )}

          <ExportModal
            episodeId={id}
            episodeTitle={episode.title || ''}
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
          />

          {episode.transcript && (
            <SpeakerOverridePanel
              episodeId={id}
              segments={episode.transcript}
              isOpen={showSpeakerPanel}
              onClose={() => setShowSpeakerPanel(false)}
              onSpeakersUpdated={handleSpeakersUpdated}
            />
          )}
        </>
      )}
    </div>
  )
}
