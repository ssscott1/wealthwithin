export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white font-bold text-xl mb-4">
            WW
          </div>
          <h1 className="text-2xl font-bold text-white">Wealth Within Trader</h1>
          <p className="text-emerald-300 text-sm mt-1">Diploma of Share Trading & Investment</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8">
          {children}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          Aligned with Wealth Within Institute Modules 1–3
        </p>
      </div>
    </div>
  )
}
