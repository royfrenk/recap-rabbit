'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Play,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  ExternalLink
} from 'lucide-react'
import {
  SubscriptionEpisode,
  SubscriptionEpisodeStatus,
  batchProcessEpisodes
} from '@/lib/api'
import { dateFormatters } from '@/lib/date'

interface EpisodeSelectorProps {
  subscriptionId: string
  episodes: SubscriptionEpisode[]
  onProcessStarted: () => void
}

const MAX_BATCH_SIZE = 19

const statusStyles: Record<SubscriptionEpisodeStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Processed', className: 'bg-green-100 text-green-800' },
  skipped: { label: 'Skipped', className: 'bg-yellow-100 text-yellow-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

function getDateRange(range: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  switch (range) {
    case 'week':
      start.setDate(start.getDate() - 7)
      break
    case 'month':
      start.setMonth(start.getMonth() - 1)
      break
    case '3months':
      start.setMonth(start.getMonth() - 3)
      break
    default:
      start = new Date(0) // All time
  }

  return { start, end }
}

export default function EpisodeSelector({
  subscriptionId,
  episodes,
  onProcessStarted
}: EpisodeSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | '3months'>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomDates, setShowCustomDates] = useState(false)

  // Filter to only show pending episodes for selection
  const pendingEpisodes = useMemo(() => {
    return episodes.filter(ep => ep.status === 'pending')
  }, [episodes])

  // Filter by date range
  const filteredEpisodes = useMemo(() => {
    if (showCustomDates && (customStartDate || customEndDate)) {
      return pendingEpisodes.filter(ep => {
        if (!ep.publish_date) return false
        const pubDate = new Date(ep.publish_date)
        if (customStartDate && pubDate < new Date(customStartDate)) return false
        if (customEndDate && pubDate > new Date(customEndDate)) return false
        return true
      })
    }

    if (dateRange === 'all') return pendingEpisodes

    const { start, end } = getDateRange(dateRange)
    return pendingEpisodes.filter(ep => {
      if (!ep.publish_date) return false
      const pubDate = new Date(ep.publish_date)
      return pubDate >= start && pubDate <= end
    })
  }, [pendingEpisodes, dateRange, customStartDate, customEndDate, showCustomDates])

  // Toggle single episode selection
  const toggleEpisode = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      if (newSelected.size >= MAX_BATCH_SIZE) {
        alert(`Maximum ${MAX_BATCH_SIZE} episodes can be selected at once`)
        return
      }
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Select all filtered episodes (up to max)
  const selectAll = () => {
    const idsToSelect = filteredEpisodes
      .slice(0, MAX_BATCH_SIZE)
      .map(ep => ep.id)
    setSelectedIds(new Set(idsToSelect))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Apply preset date range and select all matching
  const applyPresetRange = (range: 'week' | 'month' | '3months') => {
    setDateRange(range)
    setShowCustomDates(false)
    // Selection will update via filtered episodes
    setTimeout(() => {
      const { start, end } = getDateRange(range)
      const matching = pendingEpisodes.filter(ep => {
        if (!ep.publish_date) return false
        const pubDate = new Date(ep.publish_date)
        return pubDate >= start && pubDate <= end
      })
      const idsToSelect = matching.slice(0, MAX_BATCH_SIZE).map(ep => ep.id)
      setSelectedIds(new Set(idsToSelect))
    }, 0)
  }

  // Process selected episodes
  const handleProcess = async () => {
    if (selectedIds.size === 0) return

    setIsProcessing(true)
    try {
      await batchProcessEpisodes(subscriptionId, Array.from(selectedIds))
      setSelectedIds(new Set())
      onProcessStarted()
    } catch (error: any) {
      console.error('Failed to process episodes:', error)
      alert(error.response?.data?.detail || 'Failed to start processing')
    } finally {
      setIsProcessing(false)
    }
  }

  // Show completed/processing episodes separately
  const otherEpisodes = episodes.filter(ep => ep.status !== 'pending')

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Select Episodes to Process</span>
            <Badge variant="outline">
              {selectedIds.size} / {MAX_BATCH_SIZE} selected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={dateRange === 'week' && !showCustomDates ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPresetRange('week')}
            >
              Last Week
            </Button>
            <Button
              variant={dateRange === 'month' && !showCustomDates ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPresetRange('month')}
            >
              Last Month
            </Button>
            <Button
              variant={dateRange === '3months' && !showCustomDates ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyPresetRange('3months')}
            >
              Last 3 Months
            </Button>
            <Button
              variant={showCustomDates ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowCustomDates(!showCustomDates)
                setDateRange('all')
              }}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Custom Range
            </Button>
          </div>

          {/* Custom Date Inputs */}
          {showCustomDates && (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="start-date">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const matching = filteredEpisodes.slice(0, MAX_BATCH_SIZE).map(ep => ep.id)
                  setSelectedIds(new Set(matching))
                }}
              >
                Select Matching
              </Button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All ({Math.min(filteredEpisodes.length, MAX_BATCH_SIZE)})
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Episodes List */}
      {pendingEpisodes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Check className="h-8 w-8 mx-auto mb-2" />
            <p>No pending episodes to process</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Episodes ({filteredEpisodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.has(episode.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => toggleEpisode(episode.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(episode.id)}
                    onCheckedChange={() => toggleEpisode(episode.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {episode.episode_title || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateFormatters.publishDate(episode.publish_date)}
                      </span>
                      {episode.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(episode.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4">
          <Card className="shadow-lg">
            <CardContent className="py-4">
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full gap-2"
                size="lg"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Process {selectedIds.size} Episode{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Other Episodes (Processed/Processing/Failed) */}
      {otherEpisodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Other Episodes ({otherEpisodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {otherEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {episode.episode_title || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dateFormatters.publishDate(episode.publish_date)}
                      </span>
                    </div>
                  </div>
                  <Badge className={statusStyles[episode.status].className}>
                    {statusStyles[episode.status].label}
                  </Badge>
                  {episode.episode_id && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/episode/${episode.episode_id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
