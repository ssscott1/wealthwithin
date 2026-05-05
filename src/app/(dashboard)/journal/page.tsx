'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency, strategyLabel, entryMethodLabel } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen, Search, Filter } from 'lucide-react'
import type { Trade } from '@/types'

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filtered, setFiltered] = useState<Trade[]>([])
  const [search, setSearch] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('trades')
      .select('*, trading_accounts!inner(name)')
      .order('trade_date', { ascending: false })
      .then(({ data }) => {
        setTrades((data ?? []) as Trade[])
        setFiltered((data ?? []) as Trade[])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let result = trades
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.ticker.toLowerCase().includes(q) ||
        t.company_name.toLowerCase().includes(q) ||
        t.comments?.toLowerCase().includes(q) ||
        t.volume_analysis_notes?.toLowerCase().includes(q) ||
        t.bar_analysis_notes?.toLowerCase().includes(q)
      )
    }
    if (strategyFilter !== 'all') result = result.filter(t => t.strategy === strategyFilter)
    if (directionFilter !== 'all') result = result.filter(t => t.direction === directionFilter)
    setFiltered(result)
  }, [search, strategyFilter, directionFilter, trades])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Trade Journal</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          All trades with Wealth Within strategy tags and analysis notes
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Search by ticker, company, or journal notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={strategyFilter} onValueChange={setStrategyFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Strategies</SelectItem>
            <SelectItem value="dows_trend_theory">Dow&apos;s Trend Theory</SelectItem>
            <SelectItem value="ganns_swing_theory">Gann&apos;s Swing Theory</SelectItem>
            <SelectItem value="ganns_trend_theory">Gann&apos;s Trend Theory</SelectItem>
            <SelectItem value="ganns_counter_trend_theory">Gann&apos;s Counter Trend</SelectItem>
            <SelectItem value="trend_line_theory">Trend Line Theory</SelectItem>
            <SelectItem value="combination">Combination</SelectItem>
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-16 w-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              {trades.length === 0 ? 'No trades recorded yet' : 'No results found'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {trades.length === 0
                ? 'Go to an account and use "Add Trade" to record your first trade with WW strategy notes.'
                : 'Try adjusting your search or filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">Showing {filtered.length} of {trades.length} trades</p>
          {filtered.map(trade => (
            <Card key={trade.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{trade.ticker}</span>
                      <Badge variant={trade.direction === 'buy' ? 'buy' : 'sell'} className="uppercase">
                        {trade.direction}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(trade.trade_date)}</span>
                      <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        {strategyLabel(trade.strategy)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">{trade.company_name}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{Number(trade.quantity).toLocaleString()} shares @ {formatCurrency(trade.price_per_share)}</span>
                      <span>Total: {formatCurrency(trade.total_cost)}</span>
                      {trade.risk_percent && <span>Risk: {trade.risk_percent}%</span>}
                      {trade.stop_loss_level && <span>SL: {formatCurrency(trade.stop_loss_level)}</span>}
                    </div>
                    {trade.entry_method && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Entry: {entryMethodLabel(trade.entry_method)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Analysis Notes */}
                {(trade.comments || trade.volume_analysis_notes || trade.bar_analysis_notes || trade.stop_loss_reason) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {trade.comments && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Journal: </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{trade.comments}</span>
                      </div>
                    )}
                    {trade.volume_analysis_notes && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Volume (M2): </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{trade.volume_analysis_notes}</span>
                      </div>
                    )}
                    {trade.bar_analysis_notes && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bar Analysis (M2): </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{trade.bar_analysis_notes}</span>
                      </div>
                    )}
                    {trade.stop_loss_reason && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">SL Reason: </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{trade.stop_loss_reason}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
