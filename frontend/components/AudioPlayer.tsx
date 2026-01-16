'use client'

import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, Rewind, FastForward, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  audioUrl: string
  onTimeUpdate?: (currentTime: number) => void
  onPlay?: () => void
  onPause?: () => void
}

export interface AudioPlayerRef {
  seekTo: (seconds: number) => void
  play: () => void
  pause: () => void
  getCurrentTime: () => number
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ audioUrl, onTimeUpdate, onPlay, onPause }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null)
    const progressRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [isLoading, setIsLoading] = useState(true)

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds
          setCurrentTime(seconds)
        }
      },
      play: () => {
        audioRef.current?.play()
      },
      pause: () => {
        audioRef.current?.pause()
      },
      getCurrentTime: () => audioRef.current?.currentTime || 0
    }))

    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        onTimeUpdate?.(audio.currentTime)
      }

      const handleLoadedMetadata = () => {
        setDuration(audio.duration)
        setIsLoading(false)
      }

      const handlePlay = () => {
        setIsPlaying(true)
        onPlay?.()
      }

      const handlePause = () => {
        setIsPlaying(false)
        onPause?.()
      }

      const handleWaiting = () => setIsLoading(true)
      const handleCanPlay = () => setIsLoading(false)

      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('play', handlePlay)
      audio.addEventListener('pause', handlePause)
      audio.addEventListener('waiting', handleWaiting)
      audio.addEventListener('canplay', handleCanPlay)

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('pause', handlePause)
        audio.removeEventListener('waiting', handleWaiting)
        audio.removeEventListener('canplay', handleCanPlay)
      }
    }, [onTimeUpdate, onPlay, onPause])

    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause()
        } else {
          audioRef.current.play()
        }
      }
    }

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !audioRef.current) return
      const rect = progressRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const time = percentage * duration
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }

    const handlePlaybackRateChange = () => {
      const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
      const currentIndex = rates.indexOf(playbackRate)
      const nextRate = rates[(currentIndex + 1) % rates.length]
      setPlaybackRate(nextRate)
      if (audioRef.current) {
        audioRef.current.playbackRate = nextRate
      }
    }

    const skipBack = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15)
      }
    }

    const skipForward = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15)
      }
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
      <Card>
        <CardContent className="p-4">
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          {/* Progress bar */}
          <div className="mb-4">
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="relative h-2 bg-muted rounded-full cursor-pointer group"
            >
              <div
                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            {/* Skip back 15s */}
            <Button
              variant="ghost"
              size="icon"
              onClick={skipBack}
              title="Back 15 seconds"
            >
              <Rewind className="h-5 w-5" />
            </Button>

            {/* Play/Pause */}
            <Button
              size="icon"
              onClick={togglePlay}
              disabled={isLoading}
              className="h-12 w-12 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>

            {/* Skip forward 15s */}
            <Button
              variant="ghost"
              size="icon"
              onClick={skipForward}
              title="Forward 15 seconds"
            >
              <FastForward className="h-5 w-5" />
            </Button>

            {/* Playback speed */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlaybackRateChange}
              className="ml-2 w-14"
              title="Change playback speed"
            >
              {playbackRate}x
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
)

AudioPlayer.displayName = 'AudioPlayer'

export default AudioPlayer
