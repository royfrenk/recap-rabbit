'use client'

import { useState, useEffect } from 'react'
import { TranscriptSegment, updateSpeakers } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function getGenderColor(gender: string): string {
  switch (gender) {
    case 'male': return 'text-blue-500'
    case 'female': return 'text-pink-500'
    default: return 'text-muted-foreground'
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
  const [customNames, setCustomNames] = useState<string[]>([])
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Speaker Names</DialogTitle>
          <DialogDescription>
            Assign names to the speakers detected in this episode. Select from existing names or add new ones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Add new speaker name section */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Speaker Names</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddSpeaker(!showAddSpeaker)}
                className="gap-1 h-auto py-1"
              >
                <Plus className="h-3 w-3" />
                Add Name
              </Button>
            </div>

            {showAddSpeaker && (
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  placeholder="Enter new speaker name"
                  className="h-8 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomName()}
                />
                <Button size="sm" onClick={handleAddCustomName} className="h-8">
                  Add
                </Button>
              </div>
            )}

            {customNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customNames.map(name => (
                  <Badge key={name} variant="secondary" className="gap-1">
                    {name}
                    <button
                      onClick={() => handleRemoveCustomName(name)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Speaker assignments */}
          <div className="space-y-3">
            {speakers.map((speaker) => (
              <div key={speaker.label} className="flex items-center gap-3">
                {/* Gender indicator */}
                <div className={cn("flex-shrink-0", getGenderColor(speaker.gender))} title={`Gender: ${speaker.gender}`}>
                  <User className="h-4 w-4" />
                </div>

                {/* Label */}
                <div className="w-16 flex-shrink-0">
                  <Badge variant="outline" className="font-mono text-xs">
                    {speaker.label}
                  </Badge>
                </div>

                {/* Dropdown + Input combo */}
                <div className="flex-1 flex gap-2">
                  {availableNames.length > 0 && (
                    <select
                      value={availableNames.includes(editedNames[speaker.label]) ? editedNames[speaker.label] : ''}
                      onChange={(e) => e.target.value && handleNameChange(speaker.label, e.target.value)}
                      className="px-2 py-2 text-sm border border-input rounded-md focus:ring-2 focus:ring-ring bg-background"
                    >
                      <option value="">Select...</option>
                      {availableNames.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  )}
                  <Input
                    type="text"
                    value={editedNames[speaker.label] || ''}
                    onChange={(e) => handleNameChange(speaker.label, e.target.value)}
                    placeholder="Or type a name"
                    className="flex-1 h-9 text-sm"
                  />
                </div>

                {/* Segment count */}
                <span className="text-xs text-muted-foreground flex-shrink-0 w-16 text-right">
                  {speaker.segmentCount} seg.
                </span>
              </div>
            ))}
          </div>

          {speakers.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No speakers detected in this transcript.
            </p>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
