'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, FileAudio, FileText, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessingStatusProps {
  status: string
  progress: number
  error?: string | null
  statusMessage?: string | null
  durationSeconds?: number | null
  title?: string | null
}

const stages = [
  { id: 1, name: 'Downloading episode', icon: FileAudio, statuses: ['downloading'] },
  { id: 2, name: 'Transcribing audio', icon: FileText, statuses: ['transcribing', 'diarizing', 'cleaning'] },
  { id: 3, name: 'Generating summary', icon: Sparkles, statuses: ['summarizing'] },
  { id: 4, name: 'Complete', icon: CheckCircle2, statuses: ['completed'] },
]

function getStageIndex(status: string): number {
  if (status === 'pending') return -1
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].statuses.includes(status)) return i
  }
  return -1
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

export default function ProcessingStatus({
  status,
  progress,
  error,
  statusMessage,
  durationSeconds,
  title
}: ProcessingStatusProps) {
  const currentStageIndex = getStageIndex(status)
  const isFailed = status === 'failed'

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Processing Your Episode</h2>
          {title && (
            <p className="text-muted-foreground truncate">{title}</p>
          )}
          {durationSeconds && durationSeconds > 0 && (
            <p className="text-sm text-muted-foreground/70 mt-1">
              Episode length: {formatDuration(durationSeconds)}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress
              value={progress}
              className={cn(
                "h-2",
                isFailed && "[&>div]:bg-destructive"
              )}
            />
          </div>

          {/* Status message */}
          {statusMessage && (
            <p className="text-sm text-muted-foreground text-center">{statusMessage}</p>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Stages */}
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const Icon = stage.icon
              const isActive = index === currentStageIndex && !isFailed
              const isComplete = index < currentStageIndex || status === 'completed'

              return (
                <div
                  key={stage.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-all',
                    isActive && 'bg-primary/10 border border-primary/20',
                    isComplete && 'bg-accent',
                    !isActive && !isComplete && 'opacity-40'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isActive && 'bg-primary text-primary-foreground',
                      isComplete && 'bg-green-500 text-white',
                      !isActive && !isComplete && 'bg-muted'
                    )}
                  >
                    {isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={cn(isActive && 'font-medium')}>
                    {stage.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
