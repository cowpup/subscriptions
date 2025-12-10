'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface MonthlyData {
  month: string
  value: number
}

interface TierData {
  tierName: string
  count: number
  revenue: number
}

interface AnalyticsChartsProps {
  subscriberTrend: MonthlyData[]
  revenueTrend: MonthlyData[]
  subscribersByTier: TierData[]
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']

export function AnalyticsCharts({
  subscriberTrend,
  revenueTrend,
  subscribersByTier,
}: AnalyticsChartsProps) {
  const [activeChart, setActiveChart] = useState<'subscribers' | 'revenue'>('subscribers')

  // Transform tier data for pie chart
  const pieData = subscribersByTier.map((tier) => ({
    name: tier.tierName,
    value: tier.count,
  }))

  const hasData = subscriberTrend.some((d) => d.value > 0) || revenueTrend.some((d) => d.value > 0)

  if (!hasData && subscribersByTier.length === 0) {
    return (
      <div className="mt-8 rounded-lg border bg-white p-8 text-center">
        <p className="text-gray-500">No analytics data yet. Start getting subscribers and orders to see your trends!</p>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Main Trend Chart */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Growth Trends</h3>
          <div className="flex rounded-lg border p-1">
            <button
              onClick={() => setActiveChart('subscribers')}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                activeChart === 'subscribers'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Subscribers
            </button>
            <button
              onClick={() => setActiveChart('revenue')}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                activeChart === 'revenue'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Revenue
            </button>
          </div>
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'subscribers' ? (
              <AreaChart data={subscriberTrend}>
                <defs>
                  <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: number) => [value, 'Subscribers']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#subscriberGradient)"
                />
              </AreaChart>
            ) : (
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tier Distribution */}
      {subscribersByTier.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="font-semibold">Subscriber Distribution</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Tier Bar */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="font-semibold">Monthly Revenue by Tier</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={subscribersByTier}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="tierName"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
