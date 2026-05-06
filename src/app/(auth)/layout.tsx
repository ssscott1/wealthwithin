import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white mb-1 group-hover:bg-emerald-400 transition-colors">
              <TrendingUp className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">TradeJournal</h1>
          </Link>
          <p className="text-emerald-300 text-sm mt-2">Your personal share trading tracker</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8">
          {children}
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          Track smarter. Trade better.
        </p>
      </div>
    </div>
  )
}
