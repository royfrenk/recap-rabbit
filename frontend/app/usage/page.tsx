'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getUsageStats, UsageStats } from '@/lib/api'

const SERVICE_LABELS: Record<string, { name: string; unit: string; color: string }> = {
  assemblyai: {
    name: 'AssemblyAI',
    unit: 'audio hours',
    color: 'bg-blue-500'
  },
  anthropic: {
    name: 'Anthropic Claude',
    unit: 'tokens',
    color: 'bg-purple-500'
  },
  listennotes: {
    name: 'Listen Notes',
    unit: 'API calls',
    color: 'bg-green-500'
  }
}

function formatCost(cost: number): string {
  if (cost < 0.01) return '< $0.01'
  return `$${cost.toFixed(2)}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Usage</h1>
          <p className="text-gray-600 mt-1">Track your API costs and usage</p>
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Back to Home
        </Link>
      </div>

      {/* Period Selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mr-3">Time period:</label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading usage data...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Total Cost Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <h2 className="text-lg font-medium opacity-90">Total Cost ({days} days)</h2>
            <p className="text-4xl font-bold mt-2">${stats.total_cost_usd.toFixed(2)}</p>
          </div>

          {/* Service Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.by_service).map(([service, usage]) => {
              const config = SERVICE_LABELS[service] || {
                name: service,
                unit: 'units',
                color: 'bg-gray-500'
              }
              return (
                <div key={service} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">API Calls</span>
                      <span className="font-medium">{usage.calls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Input ({config.unit})</span>
                      <span className="font-medium">
                        {service === 'assemblyai'
                          ? usage.input_units.toFixed(2)
                          : usage.input_units.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Output</span>
                      <span className="font-medium">{usage.output_units.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-700 font-medium">Cost</span>
                      <span className="font-bold text-blue-600">{formatCost(usage.cost_usd)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Daily Breakdown */}
          {Object.keys(stats.daily).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-600 font-medium">Date</th>
                      {Object.keys(SERVICE_LABELS).map(service => (
                        <th key={service} className="text-right py-2 text-gray-600 font-medium">
                          {SERVICE_LABELS[service].name}
                        </th>
                      ))}
                      <th className="text-right py-2 text-gray-600 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.daily)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .slice(0, 14)
                      .map(([date, dayStats]) => (
                        <tr key={date} className="border-b border-gray-100">
                          <td className="py-2 text-gray-900">{date}</td>
                          {Object.keys(SERVICE_LABELS).map(service => (
                            <td key={service} className="text-right py-2">
                              {dayStats.by_service[service]
                                ? formatCost(dayStats.by_service[service])
                                : '-'}
                            </td>
                          ))}
                          <td className="text-right py-2 font-medium text-blue-600">
                            {formatCost(dayStats.total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {stats.recent_logs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Recent API Calls</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-600 font-medium">Time</th>
                      <th className="text-left py-2 text-gray-600 font-medium">Service</th>
                      <th className="text-left py-2 text-gray-600 font-medium">Operation</th>
                      <th className="text-right py-2 text-gray-600 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_logs.slice(0, 20).map((log, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-600">{formatDate(log.created_at)}</td>
                        <td className="py-2">
                          <span className={`inline-flex items-center gap-1.5`}>
                            <span className={`w-2 h-2 rounded-full ${
                              SERVICE_LABELS[log.service]?.color || 'bg-gray-400'
                            }`}></span>
                            {SERVICE_LABELS[log.service]?.name || log.service}
                          </span>
                        </td>
                        <td className="py-2 text-gray-700 capitalize">{log.operation}</td>
                        <td className="text-right py-2 font-medium">
                          {formatCost(log.cost_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pricing Info */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Pricing Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">AssemblyAI:</span>
                <span className="text-gray-600 ml-2">$0.37/hour (with speaker diarization)</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Claude Sonnet:</span>
                <span className="text-gray-600 ml-2">$3/M input, $15/M output tokens</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Listen Notes:</span>
                <span className="text-gray-600 ml-2">Free tier</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-600">
          No usage data available yet. Process some episodes to see your API usage.
        </div>
      )}
    </div>
  )
}
