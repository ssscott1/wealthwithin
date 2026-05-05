'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Save } from 'lucide-react'
import type { TradingPlan } from '@/types'

const schema = z.object({
  portfolio_type: z.enum(['growth', 'income', 'balanced', 'speculative']),
  time_frame: z.enum(['short_term', 'medium_term', 'long_term']),
  markets_traded: z.string(),
  money_management_rules: z.string(),
  max_risk_per_trade_percent: z.string(),
  position_sizing_method: z.string(),
  risk_level: z.enum(['conservative', 'moderate', 'aggressive']),
  psychology_notes: z.string(),
  top_down_analysis_notes: z.string(),
  backtesting_notes: z.string(),
  backtesting_win_rate: z.string().optional(),
  backtesting_profit_loss_ratio: z.string().optional(),
  additional_notes: z.string(),
})

type FormData = z.infer<typeof schema>

interface Props {
  accountId: string
  existingPlan: TradingPlan | null
  onSaved: () => void
}

export function TradingPlanForm({ accountId, existingPlan, onSaved }: Props) {
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      portfolio_type: 'growth',
      time_frame: 'medium_term',
      markets_traded: 'ASX',
      max_risk_per_trade_percent: '2',
      risk_level: 'moderate',
      money_management_rules: '',
      position_sizing_method: '',
      psychology_notes: '',
      top_down_analysis_notes: '',
      backtesting_notes: '',
      additional_notes: '',
    },
  })

  useEffect(() => {
    if (existingPlan) {
      reset({
        portfolio_type: existingPlan.portfolio_type,
        time_frame: existingPlan.time_frame,
        markets_traded: existingPlan.markets_traded?.join(', ') ?? 'ASX',
        money_management_rules: existingPlan.money_management_rules,
        max_risk_per_trade_percent: String(existingPlan.max_risk_per_trade_percent),
        position_sizing_method: existingPlan.position_sizing_method,
        risk_level: existingPlan.risk_level,
        psychology_notes: existingPlan.psychology_notes,
        top_down_analysis_notes: existingPlan.top_down_analysis_notes,
        backtesting_notes: existingPlan.backtesting_notes,
        backtesting_win_rate: existingPlan.backtesting_win_rate != null ? String(existingPlan.backtesting_win_rate) : undefined,
        backtesting_profit_loss_ratio: existingPlan.backtesting_profit_loss_ratio != null ? String(existingPlan.backtesting_profit_loss_ratio) : undefined,
        additional_notes: existingPlan.additional_notes,
      })
    }
  }, [existingPlan, reset])

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      account_id: accountId,
      user_id: user.id,
      portfolio_type: data.portfolio_type,
      time_frame: data.time_frame,
      markets_traded: data.markets_traded.split(',').map(s => s.trim()).filter(Boolean),
      strategies: ['dows_trend_theory'],
      money_management_rules: data.money_management_rules,
      max_risk_per_trade_percent: parseFloat(data.max_risk_per_trade_percent) || 2,
      position_sizing_method: data.position_sizing_method,
      risk_level: data.risk_level,
      psychology_notes: data.psychology_notes,
      top_down_analysis_notes: data.top_down_analysis_notes,
      backtesting_notes: data.backtesting_notes,
      backtesting_win_rate: data.backtesting_win_rate ? parseFloat(data.backtesting_win_rate) : null,
      backtesting_profit_loss_ratio: data.backtesting_profit_loss_ratio ? parseFloat(data.backtesting_profit_loss_ratio) : null,
      additional_notes: data.additional_notes,
    }

    const { error } = existingPlan
      ? await supabase.from('trading_plans').update(payload).eq('id', existingPlan.id)
      : await supabase.from('trading_plans').insert(payload)

    if (error) { setServerError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    onSaved()
  }

  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('WEALTH WITHIN TRADER', 105, 20, { align: 'center' })
    doc.setFontSize(14)
    doc.text('Personal Trading Plan', 105, 30, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, 105, 38, { align: 'center' })

    let y = 50
    const line = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label + ':', 15, y)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(value || '—', 150)
      doc.text(lines, 70, y)
      y += Math.max(8, lines.length * 6)
    }

    const section = (title: string) => {
      y += 4
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(title, 15, y)
      doc.setFontSize(10)
      y += 8
    }

    section('1. PORTFOLIO OVERVIEW (Module 1 – Section 2)')
    const values = (document.querySelector('form') as HTMLFormElement)
    line('Portfolio Type', existingPlan?.portfolio_type ?? '')
    line('Time Frame', existingPlan?.time_frame?.replace('_', ' ') ?? '')
    line('Markets Traded', existingPlan?.markets_traded?.join(', ') ?? 'ASX')
    line('Risk Level', existingPlan?.risk_level ?? '')

    section('2. MONEY MANAGEMENT RULES (Module 1)')
    line('Max Risk / Trade', `${existingPlan?.max_risk_per_trade_percent ?? 2}%`)
    line('Position Sizing', existingPlan?.position_sizing_method ?? '')
    line('MM Rules', existingPlan?.money_management_rules ?? '')

    section('3. TRADING STRATEGIES (Module 3)')
    line('Strategies', existingPlan?.strategies?.join(', ') ?? '')

    section('4. TOP-DOWN ANALYSIS (Module 1)')
    line('Notes', existingPlan?.top_down_analysis_notes ?? '')

    section('5. PSYCHOLOGY RULES')
    line('Notes', existingPlan?.psychology_notes ?? '')

    section('6. BACK-TESTING RESULTS (Module 3 – Section 3)')
    line('Win Rate', `${existingPlan?.backtesting_win_rate ?? '—'}%`)
    line('P/L Ratio', String(existingPlan?.backtesting_profit_loss_ratio ?? '—'))
    line('Notes', existingPlan?.backtesting_notes ?? '')

    section('7. ADDITIONAL NOTES')
    line('Notes', existingPlan?.additional_notes ?? '')

    doc.save('WW_Trading_Plan.pdf')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Portfolio Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            1. Portfolio Overview
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              Module 1 – Section 2
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Portfolio Type</Label>
              <Select defaultValue={existingPlan?.portfolio_type ?? 'growth'} onValueChange={v => setValue('portfolio_type', v as FormData['portfolio_type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="speculative">Speculative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Investment Time Frame</Label>
              <Select defaultValue={existingPlan?.time_frame ?? 'medium_term'} onValueChange={v => setValue('time_frame', v as FormData['time_frame'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_term">Short Term</SelectItem>
                  <SelectItem value="medium_term">Medium Term</SelectItem>
                  <SelectItem value="long_term">Long Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Market(s) Traded</Label>
              <Input placeholder="e.g. ASX, NYSE" {...register('markets_traded')} />
            </div>
            <div className="space-y-1.5">
              <Label>Risk Level</Label>
              <Select defaultValue={existingPlan?.risk_level ?? 'moderate'} onValueChange={v => setValue('risk_level', v as FormData['risk_level'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Money Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            2. Money Management Rules
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Module 1</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Max Risk per Trade (%)</Label>
              <Input type="number" step="0.1" min="0" max="100" placeholder="2" {...register('max_risk_per_trade_percent')} />
              {errors.max_risk_per_trade_percent && <p className="text-xs text-red-500">{errors.max_risk_per_trade_percent.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Position Sizing Method</Label>
              <Input placeholder="e.g. Fixed % of portfolio" {...register('position_sizing_method')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Money Management Rules</Label>
            <Textarea
              placeholder="e.g. Never risk more than 2% of total portfolio on any single trade. Use stop-loss orders on every trade. Maximum 10 open positions at any time..."
              {...register('money_management_rules')}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Top-Down Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            3. Top-Down Analysis Framework
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Module 1</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Top-Down Analysis Notes</Label>
            <Textarea
              placeholder={`1. MARKET ANALYSIS (ASX 200 overall trend):\n   - Is the market in an uptrend, downtrend or sideways?\n\n2. SECTOR ANALYSIS:\n   - Which sectors are outperforming?\n\n3. STOCK SELECTION:\n   - Select leading stocks in leading sectors\n   - Apply Gann/Dow criteria for entry`}
              {...register('top_down_analysis_notes')}
              className="min-h-[140px] font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Psychology */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Psychology & Trading Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`Rules to maintain trading discipline:\n- Never move a stop-loss against the position\n- Never trade without a stop-loss\n- Exit losing positions promptly without hesitation\n- Do not add to losing positions\n- Only add to winning positions\n- Review every trade against the trading plan`}
            {...register('psychology_notes')}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Back-testing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            5. Back-Testing Results
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Module 3 – Section 3</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Back-test Win Rate (%)</Label>
              <Input type="number" step="0.1" min="0" max="100" placeholder="65" {...register('backtesting_win_rate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Profit/Loss Ratio</Label>
              <Input type="number" step="0.01" min="0" placeholder="2.5" {...register('backtesting_profit_loss_ratio')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Back-testing Notes & Results</Label>
            <Textarea
              placeholder={`Back-test period: DD/MM/YYYY – DD/MM/YYYY\nMarkets tested: ASX 200\nStrategy: Dow's Trend Theory\nTotal trades tested: 50\nWin rate: 65%\nProfit/Loss Ratio: 2.5:1\nExpectancy: $X per trade\n\nKey observations:\n- Strategy performs best in trending markets\n- Avoid trading during sideways/consolidation phases`}
              {...register('backtesting_notes')}
              className="min-h-[130px] font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any additional rules, notes, or strategies specific to this account..."
            {...register('additional_notes')}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </div>
      )}

      {saved && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          Trading plan saved successfully.
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Saving...' : 'Save Trading Plan'}
        </Button>
        <Button type="button" variant="outline" onClick={exportPDF}>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </form>
  )
}
