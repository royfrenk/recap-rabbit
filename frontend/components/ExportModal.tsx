'use client'

import { useState } from 'react'
import { exportPDF } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportModalProps {
  episodeId: string
  episodeTitle: string
  isOpen: boolean
  onClose: () => void
}

export default function ExportModal({ episodeId, episodeTitle, isOpen, onClose }: ExportModalProps) {
  const [options, setOptions] = useState({
    includeSummary: true,
    includeTakeaways: true,
    includeQuotes: true,
    includeTranscript: true,
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await exportPDF(episodeId, {
        include_summary: options.includeSummary,
        include_takeaways: options.includeTakeaways,
        include_quotes: options.includeQuotes,
        include_transcript: options.includeTranscript,
      })

      // Trigger download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(episodeTitle || 'episode').replace(/\s+/g, '_').substring(0, 50)}-summary.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const checkboxes = [
    { key: 'includeSummary', label: 'Summary', description: 'Main summary paragraph' },
    { key: 'includeTakeaways', label: 'Key Takeaways', description: 'Bullet point insights' },
    { key: 'includeQuotes', label: 'Key Quotes', description: 'Memorable quotes with speakers' },
    { key: 'includeTranscript', label: 'Full Transcript', description: 'Complete transcript with speaker labels' },
  ]

  const anySelected = Object.values(options).some(Boolean)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>
            Select the sections to include in your PDF:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {checkboxes.map(({ key, label, description }) => (
            <label
              key={key}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={options[key as keyof typeof options]}
                onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                className="mt-1 w-4 h-4 text-primary rounded border-input focus:ring-primary"
              />
              <div>
                <span className="text-foreground font-medium group-hover:text-primary transition">
                  {label}
                </span>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !anySelected}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
