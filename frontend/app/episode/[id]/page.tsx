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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getEpisode, getEpisodeStatus, EpisodeResult, TranscriptSegment, RTL_LANGUAGES } from '@/lib/api'
import { ArrowLeft, Users, Download, Clock, Podcast } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const isProcessing = !['completed', 'failed'].includes(episode.status)
  const hasAudio = !!episode.audio_url
  const isRTL = episode.language_code ? RTL_LANGUAGES.has(episode.language_code) : false
  const hasBilingualContent = !!(episode.summary?.paragraph_en && episode.summary?.takeaways_en)

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push('/')}
        className="gap-2 mb-6 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Button>

      {episode.title && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{episode.title}</h1>
          {episode.podcast_name && (
            <div className="flex items-center gap-2 mt-1">
              <Podcast className="h-4 w-4 text-muted-foreground" />
              <p className="text-muted-foreground">{episode.podcast_name}</p>
            </div>
          )}
          {episode.duration_seconds && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {Math.round(episode.duration_seconds / 60)} minutes
              </p>
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="mb-6">
          <ProcessingStatus
            status={episode.status}
            progress={episode.progress}
            error={episode.error}
            statusMessage={episode.status_message}
            durationSeconds={episode.duration_seconds}
            title={episode.title}
          />
        </div>
      )}

      {episode.status === 'failed' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6">
            <h2 className="text-destructive font-semibold mb-2">Processing Failed</h2>
            <p className="text-destructive/80">{episode.error || 'An unknown error occurred'}</p>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
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

          <div className="border-b mb-6">
            <div className="flex items-center justify-between">
              <nav className="flex gap-1">
                <Button
                  variant={activeTab === 'summary' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('summary')}
                  className="rounded-b-none"
                >
                  Summary
                </Button>
                <Button
                  variant={activeTab === 'transcript' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('transcript')}
                  className="rounded-b-none"
                >
                  Full Transcript
                </Button>
              </nav>
              <div className="flex items-center gap-2 pb-2">
                {episode.transcript && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSpeakerPanel(true)}
                    className="gap-2"
                    title="Edit speaker names"
                  >
                    <Users className="h-4 w-4" />
                    Edit Speakers
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>

          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Language Toggle for bilingual content */}
              {hasBilingualContent && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-muted-foreground">Language:</span>
                  <div className="flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setShowEnglish(false)}
                      className={cn(
                        "px-3 py-1 text-sm rounded-md transition",
                        !showEnglish
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setShowEnglish(true)}
                      className={cn(
                        "px-3 py-1 text-sm rounded-md transition",
                        showEnglish
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
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
