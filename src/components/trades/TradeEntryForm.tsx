'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Search } from 'lucide-react'

const schema = z.object({
  ticker: z.string().min(1, 'Ticker is required'),
  company_name: z.string().min(1, 'Company name is required'),
  direction: z.enum(['buy', 'sell']),
  trade_date: z.string().min(1, 'Date is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  price_per_share: z.string().min(1, 'Price is required'),
  broker_fee: z.string().optional(),
  strategy: z.enum(['dows_trend_theory', 'ganns_swing_theory', 'ganns_trend_theory', 'ganns_counter_trend_theory', 'trend_line_theory', 'combination']),
  entry_method: z.enum(['swing_low_confirmed', 'swing_high_confirmed', 'trend_line_support_bounce', 'trend_line_resistance_break', 'counter_trend_reversal_volume', 'gann_angle_support', 'double_bottom', 'double_top', 'other']).optional(),
  exit_rules_applied: z.string().optional(),
  risk_percent: z.string().optional(),
  stop_loss_level: z.string().optional(),
  stop_loss_reason: z.string().optional(),
  volume_analysis_notes: z.string().optional(),
  bar_analysis_notes: z.string().optional(),
  comments: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  accountId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const STRATEGIES = [
  { value: 'dows_trend_theory', label: "Dow's Trend Theory", tooltip: "Module 3: Trade in the direction of the primary trend. Entry on confirmed higher highs/higher lows with increasing volume." },
  { value: 'ganns_swing_theory', label: "Gann's Swing Theory", tooltip: "Module 3: Identify swing highs and lows. Enter on confirmed swings with volume confirmation." },
  { value: 'ganns_trend_theory', label: "Gann's Trend Theory", tooltip: "Module 3: Trade in the direction of the main trend using Gann angles and swing analysis." },
  { value: 'ganns_counter_trend_theory', label: "Gann's Counter Trend Theory", tooltip: "Module 3: Trade counter to the main trend at key reversal zones, requires strong volume confirmation." },
  { value: 'trend_line_theory', label: 'Trend Line Theory', tooltip: "Module 3: Draw trend lines connecting swing lows (uptrend) or swing highs (downtrend). Enter on confirmed bounce." },
  { value: 'combination', label: 'Combination', tooltip: 'Using multiple Wealth Within strategies in combination for confirmation.' },
]

const ENTRY_METHODS = [
  { value: 'swing_low_confirmed', label: 'Swing Low Confirmed' },
  { value: 'swing_high_confirmed', label: 'Swing High Confirmed' },
  { value: 'trend_line_support_bounce', label: 'Trend Line Support Bounce' },
  { value: 'trend_line_resistance_break', label: 'Trend Line Resistance Break' },
  { value: 'counter_trend_reversal_volume', label: 'Counter-Trend Reversal (Volume Spike)' },
  { value: 'gann_angle_support', label: 'Gann Angle Support' },
  { value: 'double_bottom', label: 'Double Bottom' },
  { value: 'double_top', label: 'Double Top' },
  { value: 'other', label: 'Other' },
]

export function TradeEntryForm({ accountId, open, onClose, onSuccess }: Props) {
  const [serverError, setServerError] = useState('')
  const [totalCost, setTotalCost] = useState(0)
  const [tickerSearch, setTickerSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string }[]>([])
  const [searching, setSearching] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: 'buy',
      trade_date: new Date().toISOString().split('T')[0],
      broker_fee: '0',
      strategy: 'dows_trend_theory',
    },
  })

  const [direction, quantity, price, fee] = watch(['direction', 'quantity', 'price_per_share', 'broker_fee'])

  useEffect(() => {
    const q = Number(quantity) || 0
    const p = Number(price) || 0
    const f = Number(fee) || 0
    const gross = q * p
    setTotalCost(direction === 'buy' ? gross + f : gross - f)
  }, [direction, quantity, price, fee])

  const searchTicker = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/prices/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      }
    } finally {
      setSearching(false)
    }
  }

  const selectTicker = (ticker: string, name: string) => {
    setValue('ticker', ticker)
    setValue('company_name', name)
    setSearchResults([])
    setTickerSearch('')
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const qty = parseFloat(data.quantity)
    const price = parseFloat(data.price_per_share)
    const fee = parseFloat(data.broker_fee ?? '0') || 0
    const gross = qty * price
    const total = data.direction === 'buy' ? gross + fee : gross - fee

    // Upsert holding
    const { data: existingHolding } = await supabase
      .from('holdings')
      .select('*')
      .eq('account_id', accountId)
      .eq('ticker', data.ticker.toUpperCase())
      .maybeSingle()

    if (data.direction === 'buy') {
      if (existingHolding) {
        const newQty = Number(existingHolding.quantity) + qty
        const newAvg = (Number(existingHolding.quantity) * Number(existingHolding.average_purchase_price) + qty * price) / newQty
        await supabase.from('holdings').update({
          quantity: newQty,
          average_purchase_price: newAvg,
          total_cost: Number(existingHolding.total_cost) + total,
          company_name: data.company_name,
        }).eq('id', existingHolding.id)
      } else {
        await supabase.from('holdings').insert({
          account_id: accountId,
          ticker: data.ticker.toUpperCase(),
          company_name: data.company_name,
          quantity: qty,
          average_purchase_price: price,
          total_cost: total,
          first_purchase_date: data.trade_date,
        })
      }
    } else if (data.direction === 'sell' && existingHolding) {
      const newQty = Number(existingHolding.quantity) - qty
      if (newQty <= 0) {
        await supabase.from('holdings').delete().eq('id', existingHolding.id)
      } else {
        await supabase.from('holdings').update({
          quantity: newQty,
          total_cost: Number(existingHolding.average_purchase_price) * newQty,
        }).eq('id', existingHolding.id)
      }
    }

    // Insert trade record
    const { error } = await supabase.from('trades').insert({
      account_id: accountId,
      user_id: user.id,
      ticker: data.ticker.toUpperCase(),
      company_name: data.company_name,
      direction: data.direction,
      trade_date: data.trade_date,
      quantity: qty,
      price_per_share: price,
      broker_fee: fee,
      total_cost: total,
      strategy: data.strategy,
      entry_method: data.entry_method ?? null,
      exit_rules_applied: data.exit_rules_applied ?? null,
      risk_percent: data.risk_percent ? parseFloat(data.risk_percent) : null,
      stop_loss_level: data.stop_loss_level ? parseFloat(data.stop_loss_level) : null,
      stop_loss_reason: data.stop_loss_reason ?? null,
      volume_analysis_notes: data.volume_analysis_notes ?? null,
      bar_analysis_notes: data.bar_analysis_notes ?? null,
      comments: data.comments ?? null,
    })

    if (error) { setServerError(error.message); return }
    reset()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Trade Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Trade Details</h3>

            {/* Ticker search */}
            <div className="space-y-1.5 relative">
              <Label>Ticker Symbol *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search ticker or company..."
                    value={tickerSearch}
                    onChange={e => { setTickerSearch(e.target.value); searchTicker(e.target.value) }}
                  />
                  {searching && <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-pulse" />}
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
                      {searchResults.map(r => (
                        <button
                          key={r.ticker}
                          type="button"
                          onClick={() => selectTicker(r.ticker, r.name)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                        >
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{r.ticker}</span>
                          <span className="text-slate-500 dark:text-slate-400 ml-2">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  placeholder="Ticker e.g. BHP"
                  className="w-28"
                  {...register('ticker')}
                />
              </div>
              {errors.ticker && <p className="text-xs text-red-500">{errors.ticker.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input placeholder="e.g. BHP Group Limited" {...register('company_name')} />
              {errors.company_name && <p className="text-xs text-red-500">{errors.company_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Direction *</Label>
                <Select defaultValue="buy" onValueChange={v => setValue('direction', v as 'buy' | 'sell')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trade Date *</Label>
                <Input type="date" {...register('trade_date')} />
                {errors.trade_date && <p className="text-xs text-red-500">{errors.trade_date.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input type="number" step="1" min="1" placeholder="1000" {...register('quantity')} />
                {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Price per Share *</Label>
                <Input type="number" step="0.001" min="0.001" placeholder="12.50" {...register('price_per_share')} />
                {errors.price_per_share && <p className="text-xs text-red-500">{errors.price_per_share.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Broker Fee</Label>
                <Input type="number" step="0.01" min="0" placeholder="19.95" {...register('broker_fee')} />
              </div>
            </div>

            {/* Total cost display */}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Total {direction === 'buy' ? 'Cost' : 'Proceeds'}
              </span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalCost)}
              </span>
            </div>
          </section>

          {/* Wealth Within Trading Rules */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center gap-2">
              Wealth Within Trading Rules
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Module 3</span>
            </h3>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Strategy Used *
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Select the primary Wealth Within strategy applied. See Module 3 for full entry/exit rules.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select defaultValue="dows_trend_theory" onValueChange={v => setValue('strategy', v as FormData['strategy'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <span title={s.tooltip}>{s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Entry Method</Label>
              <Select onValueChange={v => setValue('entry_method', v as FormData['entry_method'])}>
                <SelectTrigger><SelectValue placeholder="Select entry method..." /></SelectTrigger>
                <SelectContent>
                  {ENTRY_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Risk % per Trade
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                    <TooltipContent>Module 1: Money Management Rule – Maximum risk per trade (typically 1–2% of portfolio)</TooltipContent>
                  </Tooltip>
                </Label>
                <Input type="number" step="0.1" min="0" max="100" placeholder="2.0" {...register('risk_percent')} />
              </div>
              <div className="space-y-1.5">
                <Label>Stop-Loss Level</Label>
                <Input type="number" step="0.001" min="0" placeholder="e.g. 11.85" {...register('stop_loss_level')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Stop-Loss Reason</Label>
              <Input placeholder="e.g. Below swing low of 12 Nov at $11.85" {...register('stop_loss_reason')} />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Volume Analysis Notes
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                  <TooltipContent>Module 2: Volume confirms the trend. Note spike volume, drying up volume at reversals, etc.</TooltipContent>
                </Tooltip>
              </Label>
              <Textarea placeholder="e.g. Volume spiked 3x on breakout – confirms buyer conviction..." {...register('volume_analysis_notes')} className="min-h-[60px]" />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Bar Analysis / Colour Coding Notes
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-slate-400 cursor-help" /></TooltipTrigger>
                  <TooltipContent>Module 2: Analyse bar patterns – outside days, key reversals, narrow range bars, closing position within bar</TooltipContent>
                </Tooltip>
              </Label>
              <Textarea placeholder="e.g. Strong bullish outside day with close in upper 25% of bar range..." {...register('bar_analysis_notes')} className="min-h-[60px]" />
            </div>

            <div className="space-y-1.5">
              <Label>Exit Rules Applied</Label>
              <Input placeholder="e.g. Sell when price closes below the trend line, or swing low violated" {...register('exit_rules_applied')} />
            </div>

            <div className="space-y-1.5">
              <Label>Trade Journal / Comments</Label>
              <Textarea
                placeholder="e.g. BHP in confirmed uptrend per Dow Theory. Entered on swing low confirmation at 3× average volume. Stop at $43.20 (last swing low). Target $52.00 (R:R = 1:3.5)..."
                {...register('comments')}
                className="min-h-[80px]"
              />
            </div>
          </section>

          {serverError && (
            <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-sm text-red-700 dark:text-red-400">
              {serverError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Trade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
