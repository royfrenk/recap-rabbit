'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Bell, BellPlus, Loader2, Check } from 'lucide-react'
import { createSubscription } from '@/lib/api'
import { useAuth } from '@/lib/auth'

interface SubscribeButtonProps {
  podcastId: string
  podcastName: string
  feedUrl: string
  artworkUrl?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showLabel?: boolean
}

export default function SubscribeButton({
  podcastId,
  podcastName,
  feedUrl,
  artworkUrl,
  variant = 'outline',
  size = 'sm',
  showLabel = true
}: SubscribeButtonProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!feedUrl) {
      setError('Feed URL not available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await createSubscription({
        podcast_id: podcastId,
        podcast_name: podcastName,
        feed_url: feedUrl,
        artwork_url: artworkUrl
      })
      setSubscribed(true)
      // Navigate to subscriptions page after short delay
      setTimeout(() => {
        router.push('/subscriptions')
      }, 1000)
    } catch (err: any) {
      if (err.response?.status === 409) {
        setSubscribed(true)
        setError('Already subscribed')
      } else {
        setError(err.response?.data?.detail || 'Failed to subscribe')
      }
    } finally {
      setLoading(false)
    }
  }

  if (subscribed) {
    return (
      <Button variant={variant} size={size} disabled className="gap-2">
        <Check className="h-4 w-4" />
        {showLabel && 'Subscribed'}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSubscribe}
      disabled={loading || !feedUrl}
      className="gap-2"
      title={error || 'Subscribe to this podcast'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <BellPlus className="h-4 w-4" />
      )}
      {showLabel && (loading ? 'Subscribing...' : 'Subscribe')}
    </Button>
  )
}
