'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Bell,
  BellOff,
  Trash2,
  RefreshCw,
  ChevronRight,
  Loader2,
  Podcast
} from 'lucide-react'
import {
  Subscription,
  updateSubscription,
  deleteSubscription,
  checkSubscriptionForNewEpisodes
} from '@/lib/api'

interface SubscriptionCardProps {
  subscription: Subscription
  onClick: () => void
  onUpdate: () => void
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function SubscriptionCard({
  subscription,
  onClick,
  onUpdate
}: SubscriptionCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsUpdating(true)
    try {
      await updateSubscription(subscription.id, {
        is_active: !subscription.is_active
      })
      onUpdate()
    } catch (error) {
      console.error('Failed to update subscription:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCheck = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsChecking(true)
    try {
      const result = await checkSubscriptionForNewEpisodes(subscription.id)
      if (result.new_episodes > 0) {
        alert(`Found ${result.new_episodes} new episode(s)!`)
      } else {
        alert('No new episodes found')
      }
      onUpdate()
    } catch (error) {
      console.error('Failed to check for episodes:', error)
      alert('Failed to check for new episodes')
    } finally {
      setIsChecking(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Unsubscribe from "${subscription.podcast_name}"?`)) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteSubscription(subscription.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete subscription:', error)
      alert('Failed to unsubscribe')
      setIsDeleting(false)
    }
  }

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Artwork */}
          <div className="flex-shrink-0">
            {subscription.artwork_url ? (
              <Image
                src={subscription.artwork_url}
                alt={subscription.podcast_name}
                width={80}
                height={80}
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Podcast className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-foreground truncate">
                {subscription.podcast_name}
              </h3>
              <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                {subscription.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>

            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>
                {subscription.total_episodes} episode{subscription.total_episodes !== 1 ? 's' : ''}
                {subscription.processed_episodes > 0 && (
                  <span className="text-primary ml-1">
                    ({subscription.processed_episodes} processed)
                  </span>
                )}
              </p>
              <p>Last checked: {formatDate(subscription.last_checked_at)}</p>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheck}
                disabled={isChecking}
                className="gap-1"
              >
                {isChecking ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Check Now
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleActive}
                disabled={isUpdating}
                className="gap-1"
              >
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : subscription.is_active ? (
                  <BellOff className="h-3 w-3" />
                ) : (
                  <Bell className="h-3 w-3" />
                )}
                {subscription.is_active ? 'Pause' : 'Resume'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1 text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Unsubscribe
              </Button>

              <div className="flex-1" />

              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
