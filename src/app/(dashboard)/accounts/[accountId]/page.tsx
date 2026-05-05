'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatPercent, formatDate, strategyLabel, getAustralianFYLabel } from '@/lib/utils'
import { calculatePerformanceStats } from '@/lib/performance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TradeEntryForm } from '@/components/trades/TradeEntryForm'
import { TradingPlanForm } from '@/components/plan/TradingPlanForm'
import {
  TrendingUp, TrendingDown, Plus, BarChart3, Target, ArrowUpDown, Info, Download
} from 'lucide-react'
import type { TradingAccount, Trade, Holding, TradingPlan } from '@/types'

export default function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const [account, setAccount] = useState<TradingAccount | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [plan, setPlan] = useState<TradingPlan | null>(null)
  const [tradeFormOpen, setTradeFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, number>>({})

  const loadData = useCallback(async () => {
    const [{ data: acc }, { data: trd }, { data: hld }, { data: pl }] = await Promise.all([
      supabase.from('trading_accounts').select('*').eq('id', accountId).single(),
      supabase.from('trades').select('*').eq('account_id', accountId).order('trade_date', { ascending: false }),
      supabase.from('holdings').select('*').eq('account_id', accountId).order('ticker'),
      supabase.from('trading_plans').select('*').eq('account_id', accountId).maybeSingle(),
    ])
    setAccount(acc as TradingAccount)
    setTrades((trd ?? []) as Trade[])
    setHoldings((hld ?? []) as Holding[])
    setPlan(pl as TradingPlan | null)
    setLoading(false)

    // Fetch live prices for holdings
    if (hld && hld.length > 0) {
      const tickers = (hld as Holding[]).map(h => h.ticker).join(',')
      const res = await fetch(`/api/prices?tickers=${tickers}`)
      if (res.ok) {
        const data = await res.json()
        setPrices(data)
      }
    }
  }, [accountId])

  useEffect(() => { loadData() }, [loadData])

  // Enrich holdings with live prices
  const enrichedHoldings = holdings.map(h => {
    const price = prices[h.ticker]
    if (!price) return h
    const currentValue = price * h.quantity
    const unrealisedPnl = currentValue - h.total_cost
    return {
      ...h,
      current_price: price,
      current_value: currentValue,
      unrealised_pnl: unrealisedPnl,
      unrealised_pnl_percent: (unrealisedPnl / h.total_cost) * 100,
    }
  })

  const stats = calculatePerformanceStats(trades, enrichedHoldings)
  const fyLabel = getAustralianFYLabel()
  const totalValue = enrichedHoldings.reduce((s, h) => s + (h.current_value ?? h.total_cost), 0)

  const exportCSV = () => {
    const rows = [
      ['Date', 'Ticker', 'Company', 'Direction', 'Qty', 'Price', 'Fee', 'Total', 'Strategy', 'Entry Method', 'Risk %', 'Stop Loss', 'Comments'],
      ...trades.map(t => [
        t.trade_date, t.ticker, t.company_name, t.direction, t.quantity,
        t.price_per_share, t.broker_fee, t.total_cost, strategyLabel(t.strategy),
        t.entry_method ?? '', t.risk_percent ?? '', t.stop_loss_level ?? '', t.comments ?? ''
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${account?.name ?? 'trades'}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )

  if (!account) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Account not found.</p>
      <Link href="/accounts"><Button variant="outline" className="mt-4">Back to Accounts</Button></Link>
    </div>
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/accounts" className="hover:text-slate-700 dark:hover:text-slate-200">Accounts</Link>
            <span>/</span>
            <span>{account.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{account.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {account.broker ?? 'No broker'} • {account.currency} • {account.account_type}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setTradeFormOpen(true)}>
            <Plus className="h-4 w-4" /> Add Trade
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Market Value" value={formatCurrency(totalValue)} icon={<BarChart3 />} />
        <MetricCard
          title="Unrealised P&L"
          value={formatCurrency(stats.total_unrealised_pnl)}
          sub={enrichedHoldings.length > 0 ? formatPercent(totalValue > 0 ? (stats.total_unrealised_pnl / (totalValue - stats.total_unrealised_pnl)) * 100 : 0) : undefined}
          positive={stats.total_unrealised_pnl >= 0}
          icon={<TrendingUp />}
        />
        <MetricCard
          title={`${fyLabel} Realised P&L`}
          value={formatCurrency(stats.ytd_pnl)}
          positive={stats.ytd_pnl >= 0}
          icon={<TrendingUp />}
          tooltip="Australian Financial Year: 1 July – 30 June"
        />
        <MetricCard
          title="Win/Loss Ratio"
          value={stats.total_trades > 0 ? stats.win_loss_ratio.toFixed(2) : '—'}
          sub={stats.total_trades > 0 ? `${stats.winning_trades}W / ${stats.losing_trades}L` : 'No closed trades yet'}
          positive={stats.win_loss_ratio >= 1}
          icon={<Target />}
          tooltip="Module 3 Section 3: Number of winning trades ÷ Number of losing trades"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Holdings ({holdings.length})</TabsTrigger>
          <TabsTrigger value="trades">Trade History ({trades.length})</TabsTrigger>
          <TabsTrigger value="plan">Trading Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings">
          <HoldingsTable holdings={enrichedHoldings} />
        </TabsContent>

        <TabsContent value="trades">
          <TradesTable trades={trades} onRefresh={loadData} />
        </TabsContent>

        <TabsContent value="plan">
          <TradingPlanForm
            accountId={accountId}
            existingPlan={plan}
            onSaved={() => loadData()}
          />
        </TabsContent>
      </Tabs>

      {/* Trade Entry Dialog */}
      {tradeFormOpen && (
        <TradeEntryForm
          accountId={accountId}
          open={tradeFormOpen}
          onClose={() => setTradeFormOpen(false)}
          onSuccess={() => { setTradeFormOpen(false); loadData() }}
        />
      )}
    </div>
  )
}

function MetricCard({ title, value, sub, positive, icon, tooltip }: {
  title: string; value: string; sub?: string; positive?: boolean; icon: React.ReactNode; tooltip?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
          {tooltip && <span title={tooltip} className="text-slate-300 dark:text-slate-600 cursor-help"><Info className="h-3.5 w-3.5" /></span>}
        </div>
        <p className={`text-2xl font-bold ${positive !== undefined ? (positive ? 'text-positive' : 'text-negative') : 'text-slate-900 dark:text-slate-100'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) return (
    <Card>
      <CardContent className="py-12 text-center">
        <ArrowUpDown className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">No holdings yet. Add a buy trade to get started.</p>
      </CardContent>
    </Card>
  )

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {['Ticker', 'Company', 'Qty', 'Avg Cost', 'Total Cost', 'Current Price', 'Market Value', 'P&L', 'P&L %', 'First Buy'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => (
                <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{h.ticker}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{h.company_name}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{Number(h.quantity).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(h.average_purchase_price)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(h.total_cost)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {h.current_price ? formatCurrency(h.current_price) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {h.current_value ? formatCurrency(h.current_value) : formatCurrency(h.total_cost)}
                  </td>
                  <td className={`px-4 py-3 font-medium ${(h.unrealised_pnl ?? 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {h.unrealised_pnl !== undefined ? formatCurrency(h.unrealised_pnl) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium ${(h.unrealised_pnl_percent ?? 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {h.unrealised_pnl_percent !== undefined ? formatPercent(h.unrealised_pnl_percent) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(h.first_purchase_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function TradesTable({ trades, onRefresh }: { trades: Trade[]; onRefresh: () => void }) {
  const deleteTrade = async (id: string) => {
    if (!confirm('Delete this trade entry?')) return
    await supabase.from('trades').delete().eq('id', id)
    onRefresh()
  }

  if (trades.length === 0) return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-slate-500 dark:text-slate-400">No trades recorded yet.</p>
      </CardContent>
    </Card>
  )

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {['Date', 'Ticker', 'Direction', 'Qty', 'Price', 'Fee', 'Total', 'Strategy', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(t.trade_date)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{t.ticker}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.direction === 'buy' ? 'buy' : 'sell'} className="uppercase">
                      {t.direction}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{Number(t.quantity).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(t.price_per_share)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatCurrency(t.broker_fee)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(t.total_cost)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {strategyLabel(t.strategy)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px]">
                    <p className="truncate text-xs">{t.comments}</p>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteTrade(t.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors text-xs"
                      aria-label="Delete trade"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
