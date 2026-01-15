'use client'

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
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            status === 'failed' ? 'bg-red-500' : status === 'completed' ? 'bg-green-500' : 'bg-primary-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {statusMessage && (
        <p className="mt-3 text-sm text-gray-600 text-center">{statusMessage}</p>
      )}

      {durationSeconds && durationSeconds > 0 && (
        <p className="mt-1 text-xs text-gray-400 text-center">
          Episode length: {formatDuration(durationSeconds)}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {status !== 'completed' && status !== 'failed' && (
        <div className="mt-4 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  )
}
