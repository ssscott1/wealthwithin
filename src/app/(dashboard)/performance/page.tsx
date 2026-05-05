'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calculatePerformanceStats } from '@/lib/performance'
import { formatCurrency, formatPercent, getAustralianFYLabel, strategyLabel } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { Target, TrendingUp, TrendingDown, Award, Info, BarChart3 } from 'lucide-react'
import type { TradingAccount, Trade, Holding } from '@/types'

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']

export default function PerformancePage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [trades, setTrades] = useState<Trade[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: accs }, { data: trd }, { data: hld }] = await Promise.all([
        supabase.from('trading_accounts').select('*').eq('is_active', true),
        supabase.from('trades').select('*').order('trade_date'),
        supabase.from('holdings').select('*'),
      ])
      setAccounts((accs ?? []) as TradingAccount[])
      setTrades((trd ?? []) as Trade[])
      setHoldings((hld ?? []) as Holding[])
      setLoading(false)
    }
    load()
  }, [])

  const filteredTrades = selectedAccount === 'all'
    ? trades
    : trades.filter(t => t.account_id === selectedAccount)

  const filteredHoldings = selectedAccount === 'all'
    ? holdings
    : holdings.filter(h => h.account_id === selectedAccount)

  const stats = calculatePerformanceStats(filteredTrades, filteredHoldings)
  const fyLabel = getAustralianFYLabel()

  // Strategy breakdown
  const strategyData = Object.entries(
    filteredTrades.reduce((acc, t) => {
      acc[t.strategy] = (acc[t.strategy] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name: strategyLabel(name), count }))

  // Monthly P&L (simplified from sell trades)
  const monthlyData = filteredTrades
    .filter(t => t.direction === 'sell')
    .reduce((acc, t) => {
      const month = t.trade_date.slice(0, 7)
      acc[month] = (acc[month] ?? 0) + (t.realised_pnl ?? 0)
      return acc
    }, {} as Record<string, number>)

  const monthlyChartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({ month, pnl }))

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Performance Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {fyLabel} · Win/Loss Ratio & Profit/Loss Ratio (Module 3 – Section 3)
          </p>
        </div>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Win Rate"
          value={`${stats.win_rate.toFixed(1)}%`}
          sub={`${stats.winning_trades} wins from ${stats.total_trades} trades`}
          icon={<Award className="h-5 w-5" />}
          positive={stats.win_rate >= 50}
          tooltip="Percentage of closed trades that were profitable"
        />
        <MetricCard
          title="Win/Loss Ratio"
          value={stats.total_trades > 0 ? stats.win_loss_ratio.toFixed(2) : '—'}
          sub={`${stats.winning_trades}W / ${stats.losing_trades}L`}
          icon={<Target className="h-5 w-5" />}
          positive={stats.win_loss_ratio >= 1}
          tooltip="Module 3 Section 3: Number of winning trades ÷ Number of losing trades. >1 means more wins than losses."
        />
        <MetricCard
          title="Profit/Loss Ratio"
          value={stats.profit_loss_ratio > 0 ? stats.profit_loss_ratio.toFixed(2) : '—'}
          sub={`Avg Win: ${formatCurrency(stats.avg_win)} / Avg Loss: ${formatCurrency(stats.avg_loss)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          positive={stats.profit_loss_ratio >= 1}
          tooltip="Module 3 Section 3: Average winning trade ÷ Average losing trade. >1 means wins are larger than losses on average."
        />
        <MetricCard
          title="Expectancy"
          value={stats.expectancy !== 0 ? formatCurrency(stats.expectancy) : '—'}
          sub="Expected profit per trade"
          icon={<BarChart3 className="h-5 w-5" />}
          positive={stats.expectancy >= 0}
          tooltip="Module 3: Expectancy = (Win Rate × Avg Win) − (Loss Rate × Avg Loss). Positive = profitable system."
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SimpleMetric title="Total Realised P&L" value={formatCurrency(stats.total_realised_pnl)} positive={stats.total_realised_pnl >= 0} />
        <SimpleMetric title={`${fyLabel} P&L`} value={formatCurrency(stats.ytd_pnl)} positive={stats.ytd_pnl >= 0} />
        <SimpleMetric title="Largest Win" value={formatCurrency(stats.largest_win)} positive />
        <SimpleMetric title="Largest Loss" value={`-${formatCurrency(stats.largest_loss)}`} positive={false} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Win/Loss Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Win/Loss Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.total_trades > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: `Wins (${stats.winning_trades})`, value: stats.winning_trades },
                      { name: `Losses (${stats.losing_trades})`, value: stats.losing_trades },
                    ]}
                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-slate-400 dark:text-slate-500 text-sm">
                No closed trades yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strategy Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {strategyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={strategyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {strategyData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-slate-400 dark:text-slate-500 text-sm">
                No trades recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly P&L Chart */}
      {monthlyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Realised P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Module 3 Reference */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Module 3 – Section 3: Performance Metrics</p>
              <div className="grid gap-2 sm:grid-cols-2 text-xs text-emerald-700 dark:text-emerald-400">
                <p><strong>Win/Loss Ratio</strong> = Winning trades ÷ Losing trades. A ratio of 1 means equal wins and losses. Combine with P/L ratio for full picture.</p>
                <p><strong>Profit/Loss Ratio</strong> = Average win size ÷ Average loss size. A ratio of 2 means average wins are twice the size of average losses.</p>
                <p><strong>Expectancy</strong> = (Win Rate × Avg Win) − (Loss Rate × Avg Loss). Positive expectancy means the system is profitable over time.</p>
                <p><strong>Optuma</strong>: Use Optuma charting software (see Module 3 Appendix) to perform back-testing and confirm these statistics on historical data.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, sub, icon, positive, tooltip }: {
  title: string; value: string; sub: string; icon: React.ReactNode; positive: boolean; tooltip: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
          <span title={tooltip} className="text-slate-300 dark:text-slate-600 cursor-help">
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className={`text-2xl font-bold ${positive ? 'text-positive' : 'text-negative'}`}>{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}

function SimpleMetric({ title, value, positive }: { title: string; value: string; positive: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{title}</p>
        <p className={`text-xl font-bold ${positive ? 'text-positive' : 'text-negative'}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
