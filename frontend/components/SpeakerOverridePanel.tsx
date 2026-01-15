'use client'

import { useState, useEffect } from 'react'
import { TranscriptSegment, updateSpeakers } from '@/lib/api'

interface SpeakerInfo {
  label: string
  currentName: string
  gender: string
  segmentCount: number
}

interface SpeakerOverridePanelProps {
  episodeId: string
  segments: TranscriptSegment[]
  isOpen: boolean
  onClose: () => void
  onSpeakersUpdated: () => void
}

function getGenderIcon(gender: string) {
  switch (gender) {
    case 'male':
      return (
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 3a3 3 0 11-3 3 3 3 0 013-3zm0 14.2a8.2 8.2 0 01-6.8-3.6c.034-2.25 4.534-3.4 6.8-3.4s6.766 1.15 6.8 3.4a8.2 8.2 0 01-6.8 3.6z"/>
        </svg>
      )
    case 'female':
      return (
        <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 3a3 3 0 11-3 3 3 3 0 013-3zm0 14.2a8.2 8.2 0 01-6.8-3.6c.034-2.25 4.534-3.4 6.8-3.4s6.766 1.15 6.8 3.4a8.2 8.2 0 01-6.8 3.6z"/>
        </svg>
      )
    default:
      return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      )
  }
}

export default function SpeakerOverridePanel({
  episodeId,
  segments,
  isOpen,
  onClose,
  onSpeakersUpdated
}: SpeakerOverridePanelProps) {
  const [speakers, setSpeakers] = useState<SpeakerInfo[]>([])
  const [editedNames, setEditedNames] = useState<Record<string, string>>({})
  const [customNames, setCustomNames] = useState<string[]>([]) // User-added names
  const [newSpeakerName, setNewSpeakerName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddSpeaker, setShowAddSpeaker] = useState(false)

  // Extract unique speakers from segments
  useEffect(() => {
    const speakerMap = new Map<string, SpeakerInfo>()

    segments.forEach(seg => {
      const label = seg.speaker_label || seg.speaker || 'Unknown'
      if (!speakerMap.has(label)) {
        speakerMap.set(label, {
          label,
          currentName: seg.speaker || label,
          gender: seg.speaker_gender || 'unknown',
          segmentCount: 1
        })
      } else {
        const info = speakerMap.get(label)!
        info.segmentCount++
      }
    })

    const sortedSpeakers = Array.from(speakerMap.values()).sort(
      (a, b) => b.segmentCount - a.segmentCount
    )
    setSpeakers(sortedSpeakers)

    // Initialize edited names with current names
    const initial: Record<string, string> = {}
    sortedSpeakers.forEach(s => {
      initial[s.label] = s.currentName
    })
    setEditedNames(initial)
  }, [segments])

  // Get all available names for dropdown (detected + custom)
  const availableNames = [
    ...new Set([
      ...speakers.map(s => s.currentName),
      ...customNames
    ])
  ].filter(name => name && !name.startsWith('Speaker '))

  const handleNameChange = (label: string, newName: string) => {
    setEditedNames(prev => ({
      ...prev,
      [label]: newName
    }))
  }

  const handleAddCustomName = () => {
    if (newSpeakerName.trim() && !customNames.includes(newSpeakerName.trim())) {
      setCustomNames(prev => [...prev, newSpeakerName.trim()])
      setNewSpeakerName('')
      setShowAddSpeaker(false)
    }
  }

  const handleRemoveCustomName = (name: string) => {
    setCustomNames(prev => prev.filter(n => n !== name))
  }

  const hasChanges = speakers.some(s => editedNames[s.label] !== s.currentName)

  const handleSave = async () => {
    if (!hasChanges) return

    setIsSaving(true)
    setError(null)

    try {
      // Build speaker map: label -> new name
      const speakerMap: Record<string, string> = {}
      speakers.forEach(s => {
        if (editedNames[s.label] && editedNames[s.label] !== s.currentName) {
          speakerMap[s.label] = editedNames[s.label]
        }
      })

      await updateSpeakers(episodeId, speakerMap)
      onSpeakersUpdated()
      onClose()
    } catch (err) {
      console.error('Failed to update speakers:', err)
      setError('Failed to save speaker names. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Speaker Names</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-4">
            Assign names to the speakers detected in this episode. Select from existing names or add new ones.
          </p>

          {/* Add new speaker name section */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Speaker Names</span>
              <button
                onClick={() => setShowAddSpeaker(!showAddSpeaker)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Name
              </button>
            </div>

            {showAddSpeaker && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  placeholder="Enter new speaker name"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomName()}
                />
                <button
                  onClick={handleAddCustomName}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}

            {customNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customNames.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {name}
                    <button
                      onClick={() => handleRemoveCustomName(name)}
                      className="hover:text-blue-600"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Speaker assignments */}
          <div className="space-y-4">
            {speakers.map((speaker) => (
              <div key={speaker.label} className="flex items-center gap-3">
                {/* Gender indicator */}
                <div className="flex-shrink-0" title={`Gender: ${speaker.gender}`}>
                  {getGenderIcon(speaker.gender)}
                </div>

                {/* Label */}
                <div className="w-16 flex-shrink-0">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {speaker.label}
                  </span>
                </div>

                {/* Dropdown + Input combo */}
                <div className="flex-1 flex gap-2">
                  {availableNames.length > 0 && (
                    <select
                      value={availableNames.includes(editedNames[speaker.label]) ? editedNames[speaker.label] : ''}
                      onChange={(e) => e.target.value && handleNameChange(speaker.label, e.target.value)}
                      className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select...</option>
                      {availableNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={editedNames[speaker.label] || ''}
                    onChange={(e) => handleNameChange(speaker.label, e.target.value)}
                    placeholder="Or type a name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                {/* Segment count */}
                <span className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
                  {speaker.segmentCount} seg.
                </span>
              </div>
            ))}
          </div>

          {speakers.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No speakers detected in this transcript.
            </p>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
