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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, User } from 'lucide-react'
import type { User as UserType } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  preferred_broker: z.string().optional(),
  subscription_level: z.enum(['diploma_student', 'graduate', 'instructor']),
  tax_year_start: z.string(),
})

type FormData = z.infer<typeof schema>

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserType | null>(null)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data as UserType)
          reset({
            name: data.name,
            preferred_broker: data.preferred_broker ?? '',
            subscription_level: data.subscription_level,
            tax_year_start: data.tax_year_start,
          })
        }
      })
    })
  }, [reset])

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update(data).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fadeIn max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your account details and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" /> Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? ''} disabled className="opacity-60" />
              <p className="text-xs text-slate-400">Email cannot be changed here</p>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Jane Smith" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Broker</Label>
              <Input placeholder="e.g. CommSec, CMC Markets, SelfWealth" {...register('preferred_broker')} />
            </div>
            <div className="space-y-1.5">
              <Label>Subscription Level</Label>
              <Select
                defaultValue={profile?.subscription_level ?? 'diploma_student'}
                onValueChange={v => setValue('subscription_level', v as FormData['subscription_level'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diploma_student">Diploma Student</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Financial Year Start</Label>
              <Select
                defaultValue={profile?.tax_year_start ?? '07-01'}
                onValueChange={v => setValue('tax_year_start', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="07-01">1 July (Australian FY)</SelectItem>
                  <SelectItem value="01-01">1 January (Calendar year)</SelectItem>
                  <SelectItem value="04-06">6 April (UK tax year)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {saved && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                Profile saved successfully.
              </div>
            )}

            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
