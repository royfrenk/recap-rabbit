'use client'

import { useState } from 'react'
import { exportPDF } from '@/lib/api'

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

  if (!isOpen) return null

  const checkboxes = [
    { key: 'includeSummary', label: 'Summary', description: 'Main summary paragraph' },
    { key: 'includeTakeaways', label: 'Key Takeaways', description: 'Bullet point insights' },
    { key: 'includeQuotes', label: 'Key Quotes', description: 'Memorable quotes with speakers' },
    { key: 'includeTranscript', label: 'Full Transcript', description: 'Complete transcript with speaker labels' },
  ]

  const anySelected = Object.values(options).some(Boolean)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Export to PDF</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Select the sections to include in your PDF:
          </p>

          <div className="space-y-4 mb-6">
            {checkboxes.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={options[key as keyof typeof options]}
                  onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                  className="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <div>
                  <span className="text-gray-900 font-medium group-hover:text-primary-600 transition">
                    {label}
                  </span>
                  <p className="text-sm text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition font-medium"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !anySelected}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
