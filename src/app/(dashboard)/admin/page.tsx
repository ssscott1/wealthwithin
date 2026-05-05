'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, strategyLabel } from '@/lib/utils'
import { calculatePerformanceStats } from '@/lib/performance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, Download, Search, ShieldAlert, Trophy } from 'lucide-react'
import type { User, Trade } from '@/types'

interface UserWithStats extends User {
  trade_count: number
  total_pnl: number
  win_rate: number
  accounts: number
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [allTrades, setAllTrades] = useState<(Trade & { user_name: string; account_name: string })[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.replace('/dashboard'); return }
      setIsAdmin(true)

      // Load all profiles
      const { data: profiles } = await supabase.from('profiles').select('*')
      // Load all trades with user/account info
      const { data: trades } = await supabase
        .from('trades')
        .select('*, profiles!inner(name, email), trading_accounts!inner(name)')
        .order('trade_date', { ascending: false })
        .limit(500)

      // Load all accounts count per user
      const { data: accountCounts } = await supabase
        .from('trading_accounts')
        .select('user_id')
        .eq('is_active', true)

      const accountsByUser: Record<string, number> = {}
      accountCounts?.forEach(a => {
        accountsByUser[a.user_id] = (accountsByUser[a.user_id] ?? 0) + 1
      })

      const enrichedTrades = (trades ?? []).map((t: Record<string, unknown>) => ({
        ...(t as unknown as Trade),
        user_name: (t.profiles as { name: string })?.name ?? 'Unknown',
        account_name: (t.trading_accounts as { name: string })?.name ?? 'Unknown',
      }))

      const enrichedUsers = (profiles ?? []).map(p => {
        const userTrades = enrichedTrades.filter(t => t.user_id === p.id)
        const stats = calculatePerformanceStats(userTrades)
        return {
          ...(p as unknown as User),
          trade_count: userTrades.length,
          total_pnl: stats.total_realised_pnl,
          win_rate: stats.win_rate,
          accounts: accountsByUser[p.id] ?? 0,
        }
      })

      setUsers(enrichedUsers)
      setAllTrades(enrichedTrades)
      setLoading(false)
    }
    load()
  }, [router])

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const exportAllTrades = () => {
    const rows = [
      ['Date', 'User', 'Account', 'Ticker', 'Direction', 'Qty', 'Price', 'Fee', 'Total', 'Strategy'],
      ...allTrades.map(t => [
        t.trade_date, t.user_name, t.account_name, t.ticker, t.direction,
        t.quantity, t.price_per_share, t.broker_fee, t.total_cost, strategyLabel(t.strategy)
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'all_trades_admin.csv'; a.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )

  if (!isAdmin) return null

  const rankingsByPnl = [...users].sort((a, b) => b.total_pnl - a.total_pnl)
  const rankingsByWinRate = [...users].filter(u => u.trade_count > 0).sort((a, b) => b.win_rate - a.win_rate)

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              Admin Only
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {users.length} users · {allTrades.length} trades logged
          </p>
        </div>
        <Button variant="outline" onClick={exportAllTrades}>
          <Download className="h-4 w-4" /> Export All Trades
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{users.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{allTrades.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Trades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {users.filter(u => u.trade_count > 0).length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active Traders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="trades">All Trades</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-10"
                  placeholder="Search users..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {['Name', 'Email', 'Level', 'Accounts', 'Trades', 'Total P&L', 'Win Rate', 'Role'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full capitalize">
                            {user.subscription_level?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.accounts}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.trade_count}</td>
                        <td className={`px-4 py-3 font-medium ${user.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {user.trade_count > 0 ? formatCurrency(user.total_pnl) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {user.trade_count > 0 ? `${user.win_rate.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'admin' ? 'warning' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Trades Tab */}
        <TabsContent value="trades">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {['Date', 'User', 'Account', 'Ticker', 'Dir', 'Qty', 'Price', 'Total', 'Strategy'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTrades.slice(0, 200).map(t => (
                      <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(t.trade_date)}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{t.user_name}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{t.account_name}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{t.ticker}</td>
                        <td className="px-4 py-3">
                          <Badge variant={t.direction === 'buy' ? 'buy' : 'sell'} className="uppercase text-xs">{t.direction}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{Number(t.quantity).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatCurrency(t.price_per_share)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{formatCurrency(t.total_cost)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {strategyLabel(t.strategy)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allTrades.length > 200 && (
                  <p className="text-xs text-slate-400 p-4">Showing first 200 trades. Export CSV for full data.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rankings Tab */}
        <TabsContent value="rankings">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  By Total Profit (internal only)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rankingsByPnl.filter(u => u.trade_count > 0).map((user, i) => (
                    <div key={user.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-5 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                          #{i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.trade_count} trades</p>
                        </div>
                      </div>
                      <span className={`font-bold ${user.total_pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatCurrency(user.total_pnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  By Win Rate (internal only)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rankingsByWinRate.map((user, i) => (
                    <div key={user.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold w-5 text-slate-400">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.trade_count} trades</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {user.win_rate.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
