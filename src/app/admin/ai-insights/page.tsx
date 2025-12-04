'use client'

import React, { useState, useEffect, memo } from 'react'
import { FaChartLine, FaUsers, FaEnvelope, FaDollarSign } from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi'
import { GrokAssistant } from '@/components/admin/GrokAssistant'
import {
  getDatabaseMetrics,
  getUserChurnData,
  getEmailCampaignData,
} from '@/api/admin/grokInsights'

interface QuickStat {
  label: string
  value: string | number
  change?: string
  icon: React.ReactNode
  color: string
}

export default function AdminAIInsightsPage() {
  const [quickStats, setQuickStats] = useState<QuickStat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadQuickStats()
  }, [])

  const loadQuickStats = async () => {
    try {
      setIsLoading(true)
      const [metrics, churnData, emailData] = await Promise.all([
        getDatabaseMetrics(),
        getUserChurnData(),
        getEmailCampaignData(),
      ])

      const stats: QuickStat[] = [
        {
          label: 'Active Users (7d)',
          value: metrics.activeUsers7d,
          change: `${((metrics.activeUsers7d / metrics.totalUsers) * 100).toFixed(1)}% of total`,
          icon: <FaUsers className="w-5 h-5" />,
          color: 'blue',
        },
        {
          label: 'Churn Risk',
          value: `${churnData.churnRate.toFixed(1)}%`,
          change: `${churnData.atRiskUsers} users`,
          icon: <FaChartLine className="w-5 h-5" />,
          color: churnData.churnRate > 20 ? 'red' : 'green',
        },
        {
          label: 'Active Listings',
          value: metrics.activeListings,
          change: `${metrics.newListings7d} new this week`,
          icon: <FaChartLine className="w-5 h-5" />,
          color: 'purple',
        },
        {
          label: 'Email Success Rate',
          value: emailData ? `${emailData.successRate.toFixed(1)}%` : 'N/A',
          change: emailData ? `${emailData.totalEmails} sent` : 'No data',
          icon: <FaEnvelope className="w-5 h-5" />,
          color: 'green',
        },
      ]

      setQuickStats(stats)
    } catch {
      // Error loading quick stats
    } finally {
      setIsLoading(false)
    }
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    }
    return colorMap[color] || colorMap.blue
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <HiSparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          </div>
          <p className="text-gray-600">
            Powered by Grok AI - Get intelligent insights about your FoodShare platform
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoading
            ? // Loading skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              ))
            : quickStats.map((stat, index) => {
                const colors = getColorClasses(stat.color)
                return (
                  <div
                    key={index}
                    className={`bg-white rounded-lg border ${colors.border} p-4 hover:shadow-lg transition-shadow`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                      <div className={`${colors.bg} p-2 rounded-lg ${colors.text}`}>
                        {stat.icon}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    {stat.change && <div className="text-sm text-gray-500">{stat.change}</div>}
                  </div>
                )
              })}
        </div>

        {/* Main Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat */}
          <div className="lg:col-span-2 h-[600px]">
            <GrokAssistant />
          </div>

          {/* Side Panel - Usage & Tips */}
          <div className="space-y-4">
            {/* Usage Monitor */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <FaDollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">API Usage</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Free Credits</span>
                    <span className="font-medium text-gray-900">$10.00</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Using cost-optimized models to maximize your credits
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">💡 Pro Tips</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>Ask specific questions for better insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>Insights are cached for 1 hour to save credits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>Use suggested questions for quick analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>Request predictions and recommendations</span>
                </li>
              </ul>
            </div>

            {/* Example Questions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Example Questions</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
                  "What time should I send emails for best engagement?"
                </li>
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
                  "Which food categories are trending?"
                </li>
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
                  "How can I reduce user churn?"
                </li>
                <li className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer">
                  "Predict next week's listing volume"
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
