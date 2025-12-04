'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ProviderStatus {
  provider: string
  state: string
  failures: number
  consecutive_successes: number
  last_failure_time: string | null
  health_score: number
  total_requests: number
  successful_requests: number
  failed_requests: number
}

interface QuotaStatus {
  provider: string
  date: string
  emails_sent: number
  daily_limit: number
  remaining: number
  percentage_used: number
}

interface RecentEmail {
  id: string
  email_type: string
  recipient_email: string
  provider_used: string
  status: string
  created_at: string
  message_id: string | null
  error_message: string | null
}

interface HealthEvent {
  id: string
  provider: string | null
  event_type: string
  severity: string
  message: string
  created_at: string
}

export default function EmailMonitoringDashboard() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus[]>([])
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus[]>([])
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>([])
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchProviderStatus = async () => {
    const { data: circuitBreakerData } = await supabase
      .from('email_circuit_breaker_state')
      .select('*')
      .order('provider')

    const { data: healthMetricsData } = await supabase
      .from('email_provider_health_metrics')
      .select('*')
      .order('provider')

    if (circuitBreakerData && healthMetricsData) {
      const combined = circuitBreakerData.map((cb) => {
        const health = healthMetricsData.find((h) => h.provider === cb.provider)
        return {
          provider: cb.provider,
          state: cb.state,
          failures: cb.failures,
          consecutive_successes: cb.consecutive_successes,
          last_failure_time: cb.last_failure_time,
          health_score: health?.health_score || 0,
          total_requests: health?.total_requests || 0,
          successful_requests: health?.successful_requests || 0,
          failed_requests: health?.failed_requests || 0,
        }
      })
      setProviderStatus(combined)
    }
  }

  const fetchQuotaStatus = async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('email_provider_quota')
      .select('*')
      .eq('date', today)
      .order('provider')

    if (data) {
      const quotas = data.map((q) => {
        const limits: Record<string, number> = {
          resend: 100,
          mailgun: 300,
          postmark: 100,
        }
        const limit = limits[q.provider] || 100
        const remaining = limit - q.emails_sent
        return {
          ...q,
          daily_limit: limit,
          remaining: Math.max(0, remaining),
          percentage_used: (q.emails_sent / limit) * 100,
        }
      })
      setQuotaStatus(quotas)
    }
  }

  const fetchRecentEmails = async () => {
    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) setRecentEmails(data)
  }

  const fetchHealthEvents = async () => {
    const { data } = await supabase
      .from('email_health_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setHealthEvents(data)
  }

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchProviderStatus(),
      fetchQuotaStatus(),
      fetchRecentEmails(),
      fetchHealthEvents(),
    ])
    setLoading(false)
  }

  useEffect(() => {
    fetchAllData()

    if (autoRefresh) {
      const interval = setInterval(fetchAllData, 30000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStateColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'half_open':
        return 'bg-yellow-100 text-yellow-800'
      case 'open':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'queued':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Email Monitoring Dashboard</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-refresh (30s)</span>
          </label>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {providerStatus.map((provider) => (
          <div key={provider.provider} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold capitalize">{provider.provider}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(provider.state)}`}>
                {provider.state.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Health Score</span>
                <span className="text-sm font-medium">{provider.health_score.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-medium">
                  {provider.total_requests > 0
                    ? ((provider.successful_requests / provider.total_requests) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Requests</span>
                <span className="text-sm font-medium">{provider.total_requests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Failures</span>
                <span className="text-sm font-medium text-red-600">{provider.failures}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quota Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Daily Quota Status</h2>
        <div className="space-y-4">
          {quotaStatus.map((quota) => (
            <div key={quota.provider}>
              <div className="flex justify-between mb-2">
                <span className="font-medium capitalize">{quota.provider}</span>
                <span className="text-sm text-gray-600">
                  {quota.emails_sent} / {quota.daily_limit} ({quota.percentage_used.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    quota.percentage_used > 80 ? 'bg-red-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(100, quota.percentage_used)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Emails */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Emails</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Recipient</th>
                <th className="text-left py-2">Provider</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEmails.map((email) => (
                <tr key={email.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 text-sm">
                    {new Date(email.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 text-sm">{email.email_type}</td>
                  <td className="py-2 text-sm">{email.recipient_email}</td>
                  <td className="py-2 text-sm capitalize">{email.provider_used}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(email.status)}`}>
                      {email.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health Events */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Health Events</h2>
        <div className="space-y-2">
          {healthEvents.map((event) => (
            <div
              key={event.id}
              className={`p-3 rounded border-l-4 ${
                event.severity === 'critical'
                  ? 'border-red-500 bg-red-50'
                  : event.severity === 'warning'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <span className="font-medium">{event.event_type}</span>
                  {event.provider && <span className="ml-2 text-gray-600">({event.provider})</span>}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{event.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
