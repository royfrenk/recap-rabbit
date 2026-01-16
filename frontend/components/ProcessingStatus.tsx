'use client'

import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessingStatusProps {
  status: string
  progress: number
  error?: string | null
  statusMessage?: string | null
  durationSeconds?: number | null
}

const statusLabels: Record<string, string> = {
  pending: 'Preparing...',
  downloading: 'Downloading audio...',
  transcribing: 'Transcribing audio...',
  diarizing: 'Identifying speakers...',
  cleaning: 'Cleaning transcript...',
  summarizing: 'Generating summary...',
  completed: 'Complete!',
  failed: 'Failed',
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

export default function ProcessingStatus({ status, progress, error, statusMessage, durationSeconds }: ProcessingStatusProps) {
  const label = statusLabels[status] || status

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      <Progress
        value={progress}
        className={cn(
          "h-2",
          status === 'failed' && "[&>div]:bg-destructive",
          status === 'completed' && "[&>div]:bg-green-500"
        )}
      />

      {statusMessage && (
        <p className="mt-3 text-sm text-muted-foreground text-center">{statusMessage}</p>
      )}

      {durationSeconds && durationSeconds > 0 && (
        <p className="mt-1 text-xs text-muted-foreground/70 text-center">
          Episode length: {formatDuration(durationSeconds)}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      {status !== 'completed' && status !== 'failed' && (
        <div className="mt-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  )
}
