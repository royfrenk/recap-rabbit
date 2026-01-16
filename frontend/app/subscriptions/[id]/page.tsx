'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ArrowLeft,
  Bell,
  BellOff,
  RefreshCw,
  Trash2,
  Podcast,
  ExternalLink
} from 'lucide-react'
import {
  getSubscription,
  updateSubscription,
  deleteSubscription,
  checkSubscriptionForNewEpisodes,
  SubscriptionWithEpisodes
} from '@/lib/api'
import EpisodeSelector from '@/components/EpisodeSelector'
import { useAuth } from '@/lib/auth'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function SubscriptionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const subscriptionId = params.id as string
  const { user, isLoading: authLoading } = useAuth()

  const [data, setData] = useState<SubscriptionWithEpisodes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && subscriptionId) {
      fetchData()
    }
  }, [user, authLoading, subscriptionId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const result = await getSubscription(subscriptionId, { limit: 500 })
      setData(result)
    } catch (error: any) {
      console.error('Failed to fetch subscription:', error)
      if (error.response?.status === 404) {
        router.push('/subscriptions')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!data) return
    setIsUpdating(true)
    try {
      await updateSubscription(subscriptionId, {
        is_active: !data.subscription.is_active
      })
      fetchData()
    } catch (error) {
      console.error('Failed to update subscription:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCheck = async () => {
    setIsChecking(true)
    try {
      const result = await checkSubscriptionForNewEpisodes(subscriptionId)
      if (result.new_episodes > 0) {
        alert(`Found ${result.new_episodes} new episode(s)!${result.auto_processed > 0 ? ` Auto-processing ${result.auto_processed} episode(s).` : ''}`)
      } else {
        alert('No new episodes found')
      }
      fetchData()
    } catch (error) {
      console.error('Failed to check for episodes:', error)
      alert('Failed to check for new episodes')
    } finally {
      setIsChecking(false)
    }
  }

  const handleDelete = async () => {
    if (!data) return
    if (!confirm(`Unsubscribe from "${data.subscription.podcast_name}"? This will remove all episode records.`)) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteSubscription(subscriptionId)
      router.push('/subscriptions')
    } catch (error) {
      console.error('Failed to delete subscription:', error)
      alert('Failed to unsubscribe')
      setIsDeleting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Subscription not found</p>
            <Button variant="link" onClick={() => router.push('/subscriptions')}>
              Back to Subscriptions
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { subscription, episodes } = data

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/subscriptions')}
        className="mb-4 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Subscriptions
      </Button>

      {/* Subscription Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* Artwork */}
            <div className="flex-shrink-0">
              {subscription.artwork_url ? (
                <Image
                  src={subscription.artwork_url}
                  alt={subscription.podcast_name}
                  width={120}
                  height={120}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-30 h-30 rounded-lg bg-muted flex items-center justify-center">
                  <Podcast className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{subscription.podcast_name}</h1>
                  <Badge
                    variant={subscription.is_active ? 'default' : 'secondary'}
                    className="mt-2"
                  >
                    {subscription.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>{subscription.total_episodes}</strong> episode
                  {subscription.total_episodes !== 1 ? 's' : ''}
                  {subscription.processed_episodes > 0 && (
                    <span className="text-primary ml-1">
                      ({subscription.processed_episodes} processed)
                    </span>
                  )}
                </p>
                <p>Last checked: {formatDate(subscription.last_checked_at)}</p>
                <p>Subscribed: {formatDate(subscription.created_at)}</p>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleCheck}
                  disabled={isChecking}
                  className="gap-2"
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Check for New Episodes
                </Button>

                <Button
                  variant="outline"
                  onClick={handleToggleActive}
                  disabled={isUpdating}
                  className="gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : subscription.is_active ? (
                    <BellOff className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {subscription.is_active ? 'Pause Auto-Processing' : 'Resume Auto-Processing'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Unsubscribe
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Episode Selector */}
      <EpisodeSelector
        subscriptionId={subscriptionId}
        episodes={episodes}
        onProcessStarted={fetchData}
      />
    </div>
  )
}
