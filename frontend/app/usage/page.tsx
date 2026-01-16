'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUsageStats, UsageStats } from '@/lib/api'
import { dateFormatters } from '@/lib/date'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft } from 'lucide-react'

const SERVICE_LABELS: Record<string, { name: string; unit: string; colorClass: string }> = {
  assemblyai: {
    name: 'AssemblyAI',
    unit: 'audio hours',
    colorClass: 'bg-blue-500'
  },
  anthropic: {
    name: 'Anthropic Claude',
    unit: 'tokens',
    colorClass: 'bg-primary'
  },
  listennotes: {
    name: 'Listen Notes',
    unit: 'API calls',
    colorClass: 'bg-green-500'
  }
}

function formatCost(cost: number): string {
  if (cost < 0.01) return '< $0.01'
  return `$${cost.toFixed(2)}`
}


export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const data = await getUsageStats(days)
        setStats(data)
      } catch (err) {
        setError('Failed to load usage statistics')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [days])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Usage</h1>
          <p className="text-muted-foreground mt-1">Track your API costs and usage</p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-foreground mr-3">Time period:</label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading usage data...</span>
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="space-y-8">
          {/* Total Cost Card */}
          <Card className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground border-0">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium opacity-90">Total Cost ({days} days)</h2>
              <p className="text-4xl font-bold mt-2">${stats.total_cost_usd.toFixed(2)}</p>
            </CardContent>
          </Card>

          {/* Service Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.by_service).map(([service, usage]) => {
              const config = SERVICE_LABELS[service] || {
                name: service,
                unit: 'units',
                colorClass: 'bg-muted'
              }
              return (
                <Card key={service}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-3 h-3 rounded-full ${config.colorClass}`}></div>
                      <h3 className="font-semibold text-foreground">{config.name}</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">API Calls</span>
                        <span className="font-medium">{usage.calls}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Input ({config.unit})</span>
                        <span className="font-medium">
                          {service === 'assemblyai'
                            ? usage.input_units.toFixed(2)
                            : usage.input_units.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Output</span>
                        <span className="font-medium">{usage.output_units.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">Cost</span>
                        <span className="font-bold text-primary">{formatCost(usage.cost_usd)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Daily Breakdown */}
          {Object.keys(stats.daily).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                        {Object.keys(SERVICE_LABELS).map(service => (
                          <th key={service} className="text-right py-2 text-muted-foreground font-medium">
                            {SERVICE_LABELS[service].name}
                          </th>
                        ))}
                        <th className="text-right py-2 text-muted-foreground font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.daily)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 14)
                        .map(([date, dayStats]) => (
                          <tr key={date} className="border-b border-border/50">
                            <td className="py-2 text-foreground">{date}</td>
                            {Object.keys(SERVICE_LABELS).map(service => (
                              <td key={service} className="text-right py-2 text-muted-foreground">
                                {dayStats.by_service[service]
                                  ? formatCost(dayStats.by_service[service])
                                  : '-'}
                              </td>
                            ))}
                            <td className="text-right py-2 font-medium text-primary">
                              {formatCost(dayStats.total)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          {stats.recent_logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-muted-foreground font-medium">Time</th>
                        <th className="text-left py-2 text-muted-foreground font-medium">Service</th>
                        <th className="text-left py-2 text-muted-foreground font-medium">Operation</th>
                        <th className="text-right py-2 text-muted-foreground font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_logs.slice(0, 20).map((log, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 text-muted-foreground">{dateFormatters.usageLog(log.created_at)}</td>
                          <td className="py-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                SERVICE_LABELS[log.service]?.colorClass || 'bg-muted'
                              }`}></span>
                              {SERVICE_LABELS[log.service]?.name || log.service}
                            </span>
                          </td>
                          <td className="py-2 text-muted-foreground capitalize">{log.operation}</td>
                          <td className="text-right py-2 font-medium">
                            {formatCost(log.cost_usd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Info */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Pricing Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-foreground">AssemblyAI:</span>
                  <span className="text-muted-foreground ml-2">$0.37/hour (with speaker diarization)</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Claude Sonnet:</span>
                  <span className="text-muted-foreground ml-2">$3/M input, $15/M output tokens</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Listen Notes:</span>
                  <span className="text-muted-foreground ml-2">Free tier</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No usage data available yet. Process some episodes to see your API usage.
        </div>
      )}
    </div>
  )
}
