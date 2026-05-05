'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatPercent, getAustralianFYLabel } from '@/lib/utils'
import { calculatePerformanceStats } from '@/lib/performance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, TrendingDown, Briefcase, Plus, BarChart3,
  BookOpen, Eye, Target, Info
} from 'lucide-react'
import type { TradingAccount, Trade, Holding } from '@/types'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [allTrades, setAllTrades] = useState<Trade[]>([])
  const [allHoldings, setAllHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: accs }, { data: trades }, { data: holdings }] = await Promise.all([
        supabase.from('trading_accounts').select('*').eq('is_active', true).order('created_at'),
        supabase.from('trades').select('*').order('trade_date', { ascending: false }),
        supabase.from('holdings').select('*'),
      ])
      setAccounts((accs ?? []) as TradingAccount[])
      setAllTrades((trades ?? []) as Trade[])
      setAllHoldings((holdings ?? []) as Holding[])
      setLoading(false)
    }
    load()
  }, [])

  const stats = calculatePerformanceStats(allTrades, allHoldings)
  const fyLabel = getAustralianFYLabel()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Good {getGreeting()}, {profile?.name?.split(' ')[0] ?? 'Trader'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {fyLabel} • Wealth Within Institute – Diploma of Share Trading
          </p>
        </div>
        <Link href="/accounts">
          <Button>
            <Plus className="h-4 w-4" />
            New Account
          </Button>
        </Link>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Unrealised P&L"
          value={formatCurrency(stats.total_unrealised_pnl)}
          sub={formatPercent(allHoldings.length > 0
            ? (stats.total_unrealised_pnl / allHoldings.reduce((s, h) => s + h.total_cost, 0)) * 100 : 0)}
          positive={stats.total_unrealised_pnl >= 0}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <SummaryCard
          title={`${fyLabel} Realised P&L`}
          value={formatCurrency(stats.ytd_pnl)}
          positive={stats.ytd_pnl >= 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <SummaryCard
          title="Win/Loss Ratio"
          value={stats.win_loss_ratio.toFixed(2)}
          sub={`${stats.winning_trades}W / ${stats.losing_trades}L of ${stats.total_trades} trades`}
          positive={stats.win_loss_ratio >= 1}
          icon={<Target className="h-5 w-5" />}
          tooltip="Module 3 Section 3: Win/Loss Ratio = Number of winning trades ÷ Number of losing trades"
        />
        <SummaryCard
          title="Profit/Loss Ratio"
          value={stats.profit_loss_ratio.toFixed(2)}
          sub={`Expectancy: ${formatCurrency(stats.expectancy)}`}
          positive={stats.profit_loss_ratio >= 1}
          icon={<BarChart3 className="h-5 w-5" />}
          tooltip="Module 3 Section 3: Profit/Loss Ratio = Average win ÷ Average loss. Expectancy = (Win Rate × Avg Win) − (Loss Rate × Avg Loss)"
        />
      </div>

      {/* Accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Trading Accounts</h2>
          <Link href="/accounts" className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
            View all →
          </Link>
        </div>
        {accounts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">No accounts yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Create your first trading account to get started
              </p>
              <Link href="/accounts">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map(account => {
              const accountTrades = allTrades.filter(t => t.account_id === account.id)
              const accountHoldings = allHoldings.filter(h => h.account_id === account.id)
              const astats = calculatePerformanceStats(accountTrades, accountHoldings)
              const totalValue = accountHoldings.reduce((s, h) => s + (h.current_value ?? h.total_cost), 0)
              return (
                <Link key={account.id} href={`/accounts/${account.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{account.name}</CardTitle>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{account.broker ?? 'No broker set'}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">{account.account_type.replace('_', ' ')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Market Value</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(totalValue)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Unrealised P&L</span>
                          <span className={astats.total_unrealised_pnl >= 0 ? 'text-positive font-medium' : 'text-negative font-medium'}>
                            {formatCurrency(astats.total_unrealised_pnl)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Holdings</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{accountHoldings.length} stocks</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
            <Link href="/accounts">
              <Card className="border-dashed hover:border-emerald-400 transition-colors cursor-pointer h-full">
                <CardContent className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Plus className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Add account</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Links – WW Module Reference */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">WW Institute Reference</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Dow's Trend Theory", module: 'Module 3', desc: 'Entry on confirmed trend continuation with rising volume', href: '/journal' },
            { title: "Gann's Swing Theory", module: 'Module 3', desc: 'Identify swing highs/lows for entry and stop placement', href: '/journal' },
            { title: "Gann's Trend Theory", module: 'Module 3', desc: 'Trade in direction of the main trend', href: '/journal' },
            { title: 'Trend Line Theory', module: 'Module 3', desc: 'Draw trend lines and trade bounces from support', href: '/journal' },
            { title: 'Top-Down Analysis', module: 'Module 1', desc: 'Market → Sector → Stock analysis framework', href: '/watchlist' },
            { title: 'Money Management', module: 'Module 1', desc: 'Position sizing, max 2% risk per trade rule', href: '/accounts' },
          ].map(item => (
            <Link key={item.title} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">{item.module}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function SummaryCard({
  title, value, sub, positive, icon, tooltip
}: {
  title: string; value: string; sub?: string; positive?: boolean; icon: React.ReactNode; tooltip?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
          <div className="flex items-center gap-1">
            {tooltip && (
              <span title={tooltip} className="text-slate-300 dark:text-slate-600 cursor-help">
                <Info className="h-3.5 w-3.5" />
              </span>
            )}
            <div className={`p-1.5 rounded-lg ${positive !== undefined ? (positive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400') : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              {positive !== undefined ? (positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />) : icon}
            </div>
          </div>
        </div>
        <p className={`text-2xl font-bold ${positive !== undefined ? (positive ? 'text-positive' : 'text-negative') : 'text-slate-900 dark:text-slate-100'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
