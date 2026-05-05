'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { strategyLabel } from '@/lib/utils'
import type { WatchlistItem } from '@/types'

const schema = z.object({
  ticker: z.string().min(1, 'Ticker required'),
  company_name: z.string().min(1, 'Company name required'),
  sector: z.string().optional(),
  pe_ratio: z.string().optional(),
  market_cap: z.string().optional(),
  dividend_yield: z.string().optional(),
  fundamental_notes: z.string().optional(),
  trend_direction: z.enum(['uptrend', 'downtrend', 'sideways']).optional(),
  key_support_level: z.string().optional(),
  key_resistance_level: z.string().optional(),
  technical_notes: z.string().optional(),
  strategy_alignment: z.enum(['dows_trend_theory', 'ganns_swing_theory', 'ganns_trend_theory', 'ganns_counter_trend_theory', 'trend_line_theory', 'combination']).optional(),
  priority: z.enum(['high', 'medium', 'low']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [prices, setPrices] = useState<Record<string, { price: number; change_percent: number }>>({})

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  })

  const loadItems = async () => {
    const { data } = await supabase.from('watchlist').select('*').order('priority').order('added_at', { ascending: false })
    setItems((data ?? []) as WatchlistItem[])
    setLoading(false)

    if (data && data.length > 0) {
      const tickers = (data as WatchlistItem[]).map(i => i.ticker).join(',')
      const res = await fetch(`/api/prices?tickers=${tickers}`)
      if (res.ok) {
        const priceData = await res.json()
        setPrices(priceData)
      }
    }
  }

  useEffect(() => { loadItems() }, [])

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      ...data,
      ticker: data.ticker.toUpperCase(),
      user_id: user.id,
      pe_ratio: data.pe_ratio ? parseFloat(data.pe_ratio) : null,
      dividend_yield: data.dividend_yield ? parseFloat(data.dividend_yield) : null,
      key_support_level: data.key_support_level ? parseFloat(data.key_support_level) : null,
      key_resistance_level: data.key_resistance_level ? parseFloat(data.key_resistance_level) : null,
    }
    const { error } = await supabase.from('watchlist').upsert(payload, { onConflict: 'user_id,ticker' })
    if (!error) { setOpen(false); reset(); loadItems() }
  }

  const removeItem = async (id: string) => {
    await supabase.from('watchlist').delete().eq('id', id)
    loadItems()
  }

  const priorityColor: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }

  const trendIcon = (t?: string) =>
    t === 'uptrend' ? <TrendingUp className="h-4 w-4 text-emerald-500" />
    : t === 'downtrend' ? <TrendingDown className="h-4 w-4 text-red-500" />
    : <Minus className="h-4 w-4 text-slate-400" />

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Watchlist</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Top-down analysis tracking — Market → Sector → Stock (Module 1)
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Stock
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Eye className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Your watchlist is empty</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Add stocks you are analysing using top-down analysis. Track both fundamental and technical criteria.
            </p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add First Stock</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(item => {
            const priceData = prices[item.ticker]
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-slate-900 dark:text-slate-100">{item.ticker}</span>
                        {trendIcon(item.trend_direction)}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColor[item.priority]}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.company_name}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {priceData && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Current Price</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          ${priceData.price.toFixed(2)}
                        </span>
                        <span className={priceData.change_percent >= 0 ? 'text-positive text-xs' : 'text-negative text-xs'}>
                          {priceData.change_percent >= 0 ? '+' : ''}{priceData.change_percent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                  {item.sector && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Sector</span>
                      <span className="text-slate-700 dark:text-slate-300">{item.sector}</span>
                    </div>
                  )}
                  {item.strategy_alignment && (
                    <div className="text-xs bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1">
                      <span className="text-slate-500 dark:text-slate-400">Strategy: </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{strategyLabel(item.strategy_alignment)}</span>
                    </div>
                  )}
                  {item.key_support_level && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded px-2 py-1">
                        <span className="text-emerald-600 dark:text-emerald-400">Support: </span>
                        <span className="font-medium">${item.key_support_level}</span>
                      </div>
                      {item.key_resistance_level && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                          <span className="text-red-600 dark:text-red-400">Resistance: </span>
                          <span className="font-medium">${item.key_resistance_level}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {item.technical_notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.technical_notes}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add to Watchlist</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ticker *</Label>
                <Input placeholder="BHP" {...register('ticker')} />
                {errors.ticker && <p className="text-xs text-red-500">{errors.ticker.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input placeholder="BHP Group Limited" {...register('company_name')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sector</Label>
                <Input placeholder="e.g. Materials, Financials" {...register('sector')} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select defaultValue="medium" onValueChange={v => setValue('priority', v as FormData['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fundamental Analysis</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">P/E Ratio</Label>
                <Input type="number" step="0.1" placeholder="18.5" {...register('pe_ratio')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Div Yield %</Label>
                <Input type="number" step="0.01" placeholder="3.5" {...register('dividend_yield')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Market Cap</Label>
                <Input placeholder="e.g. $50B" {...register('market_cap')} />
              </div>
            </div>
            <Textarea placeholder="Fundamental analysis notes..." {...register('fundamental_notes')} className="min-h-[60px] text-xs" />

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Technical Analysis</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Trend</Label>
                <Select onValueChange={v => setValue('trend_direction', v as FormData['trend_direction'])}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uptrend">Uptrend</SelectItem>
                    <SelectItem value="downtrend">Downtrend</SelectItem>
                    <SelectItem value="sideways">Sideways</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Support Level</Label>
                <Input type="number" step="0.01" placeholder="42.50" {...register('key_support_level')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Resistance Level</Label>
                <Input type="number" step="0.01" placeholder="48.00" {...register('key_resistance_level')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Strategy Alignment</Label>
              <Select onValueChange={v => setValue('strategy_alignment', v as FormData['strategy_alignment'])}>
                <SelectTrigger><SelectValue placeholder="Select strategy..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dows_trend_theory">Dow&apos;s Trend Theory</SelectItem>
                  <SelectItem value="ganns_swing_theory">Gann&apos;s Swing Theory</SelectItem>
                  <SelectItem value="ganns_trend_theory">Gann&apos;s Trend Theory</SelectItem>
                  <SelectItem value="ganns_counter_trend_theory">Gann&apos;s Counter Trend Theory</SelectItem>
                  <SelectItem value="trend_line_theory">Trend Line Theory</SelectItem>
                  <SelectItem value="combination">Combination</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Technical analysis notes (trend lines, bar patterns, volume observations)..." {...register('technical_notes')} className="min-h-[60px] text-xs" />
            <Textarea placeholder="General notes..." {...register('notes')} className="min-h-[50px] text-xs" />

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reset() }}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add to Watchlist'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
