import Link from 'next/link'
import {
  TrendingUp, BarChart2, BookOpen, Bell, Shield, Users,
  CheckCircle, ArrowRight, Star, PieChart, Target
} from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: 'Trade Journal',
    description: 'Log every buy and sell with notes, strategy tags, and automatic P&L calculation using FIFO matching.',
  },
  {
    icon: PieChart,
    title: 'Portfolio Allocation',
    description: 'See exactly how your capital is distributed across holdings. Track cash remaining and rebalance with confidence.',
  },
  {
    icon: BarChart2,
    title: 'Performance Analytics',
    description: 'Win rate, average gain/loss, profit factor, and equity curve — all calculated automatically from your trades.',
  },
  {
    icon: Target,
    title: 'Capital Risk Tracking',
    description: 'Every trade shows its cost as a percentage of your total portfolio capital. Get warned before risking more than 20%.',
  },
  {
    icon: Bell,
    title: 'Watchlist',
    description: 'Monitor ASX tickers with live prices auto-fetched from Yahoo Finance. Add notes for each stock you\'re watching.',
  },
  {
    icon: Shield,
    title: 'Multiple Accounts',
    description: 'Manage separate portfolios — live trading, super fund, paper trading, or options — all in one place.',
  },
]

const steps = [
  { step: '01', title: 'Create an account', description: 'Sign up free and set up your first trading portfolio in under a minute.' },
  { step: '02', title: 'Log your trades', description: 'Enter buys and sells with price, quantity, and fees. We handle all the maths.' },
  { step: '03', title: 'Review & improve', description: 'Analyse your performance stats, spot patterns, and trade smarter over time.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <nav className="border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            TradeJournal
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors px-4 py-2"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Star className="h-3.5 w-3.5" />
          Built for ASX traders
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Your trading journal,<br />
          <span className="text-emerald-600 dark:text-emerald-400">finally done right</span>
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Log trades, track P&amp;L, monitor your watchlist, and analyse your performance — all in one clean dashboard built for Australian share traders.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-emerald-600/20"
          >
            Create your free account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-medium px-8 py-4 rounded-xl text-base transition-colors"
          >
            Sign in to your account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Everything you need to trade smarter</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
            Purpose-built tools to help you track, analyse, and improve your trading performance.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">{title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 dark:bg-slate-900 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Up and running in minutes</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">No complex setup. Just sign up and start logging your trades.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold text-lg mb-4">
                  {step}
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits list */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="grid gap-12 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Built for serious ASX traders</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Whether you&apos;re trading your SMSF, a paper portfolio, or a live brokerage account — TradeJournal keeps it all organised and insightful.
            </p>
            <ul className="space-y-3">
              {[
                'Automatic FIFO P&L matching on sell trades',
                'Australian financial year reporting (1 Jul – 30 Jun)',
                'Capital risk warnings on oversized positions',
                'Live ASX price lookups via Yahoo Finance',
                'Multiple separate portfolios per account',
                'Your data stays private — only you can see it',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-8 text-white text-center shadow-xl">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-80" />
            <p className="text-4xl font-extrabold mb-2">100%</p>
            <p className="text-emerald-200 font-medium mb-6">private &amp; secure</p>
            <p className="text-sm text-emerald-100 leading-relaxed">
              Every account is fully isolated. Your trades and portfolios are only ever visible to you, protected by row-level security.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 dark:bg-slate-800 py-20 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to trade smarter?</h2>
          <p className="text-slate-400 mb-8 text-lg">Join traders who use TradeJournal to stay on top of their portfolio and continuously improve.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Create your free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-8 py-4 rounded-xl text-base transition-colors"
            >
              Sign in
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-6">
            Forgot your password?{' '}
            <Link href="/forgot-password" className="text-emerald-400 hover:text-emerald-300 underline">
              Reset it here
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-white">
              <TrendingUp className="h-3 w-3" />
            </div>
            TradeJournal
          </div>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Register</Link>
            <Link href="/forgot-password" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Reset password</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
