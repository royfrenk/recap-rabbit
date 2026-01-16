'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Bell, Plus, Podcast } from 'lucide-react'
import { listSubscriptions, Subscription } from '@/lib/api'
import SubscriptionCard from '@/components/SubscriptionCard'
import { useAuth } from '@/lib/auth'

export default function SubscriptionsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchSubscriptions()
    }
  }, [user, authLoading])

  const fetchSubscriptions = async () => {
    setIsLoading(true)
    try {
      const data = await listSubscriptions()
      setSubscriptions(data.subscriptions)
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionClick = (subscriptionId: string) => {
    router.push(`/subscriptions/${subscriptionId}`)
  }

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6" />
            My Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => router.push('/')} className="gap-2">
          <Plus className="h-4 w-4" />
          Subscribe to Podcast
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading subscriptions...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Podcast className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-4">
              Subscribe to your favorite podcasts to automatically process new episodes
            </p>
            <Button onClick={() => router.push('/')}>
              <Plus className="h-4 w-4 mr-2" />
              Find Podcasts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onClick={() => handleSubscriptionClick(subscription.id)}
              onUpdate={fetchSubscriptions}
            />
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 bg-muted/50">
        <CardContent className="py-4">
          <h4 className="font-medium mb-2">How subscriptions work</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• New episodes are checked automatically every 6 hours</li>
            <li>• Active subscriptions auto-process new episodes</li>
            <li>• Pause a subscription to stop auto-processing</li>
            <li>• Process up to 19 past episodes at once</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
