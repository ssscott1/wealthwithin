'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Briefcase, ArrowRight, Trash2 } from 'lucide-react'
import { accountTypeLabel } from '@/lib/utils'
import type { TradingAccount } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Account name is required'),
  account_type: z.enum(['live', 'paper', 'super', 'options', 'other']),
  broker: z.string().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { account_type: 'live', currency: 'AUD' },
  })

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at')
    setAccounts((data ?? []) as TradingAccount[])
    setLoading(false)
  }

  useEffect(() => { loadAccounts() }, [])

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('trading_accounts').insert({
      ...data,
      user_id: user.id,
    })
    if (!error) {
      setOpen(false)
      reset()
      loadAccounts()
    }
  }

  const deleteAccount = async (id: string) => {
    if (!confirm('Delete this account? All trades and holdings will also be deleted.')) return
    await supabase.from('trading_accounts').update({ is_active: false }).eq('id', id)
    loadAccounts()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Trading Accounts</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your separate trading portfolios
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />New Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Trading Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Account Name *</Label>
                <Input id="name" placeholder="e.g. ASX Growth Portfolio" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Account Type *</Label>
                <Select defaultValue="live" onValueChange={v => setValue('account_type', v as FormData['account_type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live Trading</SelectItem>
                    <SelectItem value="paper">Paper / Demo</SelectItem>
                    <SelectItem value="super">Super Fund</SelectItem>
                    <SelectItem value="options">Options</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="broker">Broker</Label>
                <Input id="broker" placeholder="e.g. CommSec, CMC Markets" {...register('broker')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" placeholder="AUD" defaultValue="AUD" {...register('currency')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Optional notes about this account..." {...register('description')} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="h-16 w-16 text-slate-200 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No accounts yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Create separate accounts to track different portfolios — ASX, Super Fund, Options, or Demo accounts.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map(account => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    {account.broker && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{account.broker}</p>
                    )}
                  </div>
                  <Badge variant="secondary">{accountTypeLabel(account.account_type)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {account.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{account.description}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  Currency: {account.currency} • Created {new Date(account.created_at).toLocaleDateString('en-AU')}
                </p>
                <div className="flex gap-2">
                  <Link href={`/accounts/${account.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      Open <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAccount(account.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors cursor-pointer"
            onClick={() => setOpen(true)}>
            <CardContent className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Plus className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Add account</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
