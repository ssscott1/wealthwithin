# Wealth Within Trader

A professional, full-stack share trading journal and portfolio manager built specifically for students and graduates of the **Wealth Within Institute Diploma of Share Trading and Investment**. Every feature is aligned with Modules 1–3 of the Diploma curriculum.

---

## Features

### Core Platform
- **Authentication** – Secure email/password login via Supabase Auth, password reset via email link
- **Multiple Trading Accounts** – Unlimited isolated accounts (Live, Paper/Demo, Super Fund, Options)
- **Dark / Light Mode** – WCAG 2.2 AA accessible, full keyboard navigation, screen-reader friendly

### Account Dashboard
- Real-time portfolio summary: Market Value, Unrealised P&L, YTD P&L (Australian FY: 1 July)
- **Win/Loss Ratio** and **Profit/Loss Ratio** (auto-calculated — Module 3 Section 3)
- Live holdings table with current prices via Yahoo Finance (swappable for Polygon.io / Alpha Vantage)
- Complete trade history with full audit trail

### Trade Entry (Module 3 aligned)
All Wealth Within strategies and entry methods:
- **Dow's Trend Theory** (Module 3)
- **Gann's Swing Theory** (Module 3)
- **Gann's Trend Theory** (Module 3)
- **Gann's Counter Trend Theory** (Module 3)
- **Trend Line Theory** (Module 3)
- Volume analysis notes (Module 2)
- Bar analysis / colour coding notes (Module 2)
- Risk %, Stop-loss level + reason
- Full trade journal comments field

### Trading Plan Builder (Module 1 Section 2)
- Portfolio type, time frame, risk level
- Money management rules (max risk per trade)
- Top-down analysis notes (Market → Sector → Stock)
- Back-testing results (win rate, P/L ratio — Module 3)
- Psychology & discipline rules
- **PDF export** of complete trading plan

### Performance Dashboard (Module 3 Section 3)
- Win Rate, Win/Loss Ratio, Profit/Loss Ratio, **Expectancy**
- Visual charts: Win/Loss pie, strategy breakdown, monthly P&L
- Filterable by account or all accounts

### Watchlist
- Top-down analysis fields: trend direction, support/resistance, fundamental ratios
- Strategy alignment tagging
- Live price display with daily % change

### Trade Journal
- Searchable across all accounts
- Filter by strategy, direction
- Full analysis notes visible

### Admin Dashboard (admin role only)
- User list with stats (trades, P&L, win rate, accounts)
- Global trade log across all users
- Internal performance rankings (by profit, by win rate)
- Export all data to CSV

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI primitives |
| Auth & Database | Supabase (PostgreSQL + Row Level Security) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| PDF Export | jsPDF |
| Stock Prices | Yahoo Finance (unofficial) – swap for Polygon.io / Alpha Vantage |
| Deployment | Vercel (recommended) |

---

## Quick Start

### 1. Prerequisites
- Node.js 20+
- A free [Supabase](https://supabase.com) account

### 2. Clone and install
```bash
git clone https://github.com/ssscott1/wealthwithin.git
cd wealthwithin
npm install
```

### 3. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. In the SQL editor, run the full contents of `supabase/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 4. Configure environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 5. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## Deployment (Vercel)

1. Push to GitHub (already done)
2. Go to [vercel.com](https://vercel.com) → Import repository
3. Add the 3 environment variables from step 4 above
4. Deploy — Vercel auto-detects Next.js

---

## Making a User an Admin

In the Supabase SQL editor:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

---

## Upgrading the Stock Price Provider

The price fetching is in `src/lib/prices.ts`. To swap to **Polygon.io**:

```typescript
// In fetchStockPrice(), replace the Yahoo Finance fetch with:
const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${process.env.POLYGON_API_KEY}`
```

For **Alpha Vantage**:
```typescript
const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
```

---

## Database Schema

See `supabase/schema.sql` for the complete schema including:
- `profiles` — extends Supabase auth.users
- `trading_accounts` — isolated per-user accounts
- `trades` — full trade log with all WW fields
- `holdings` — aggregated current positions
- `trading_plans` — one plan per account
- `watchlist` — per-user watchlist with analysis
- `backtest_entries` — back-testing journal

All tables have Row Level Security (RLS) policies ensuring users can only access their own data.

---

## Curriculum Alignment

| Feature | Module |
|---|---|
| Trade entry with strategy tags | Module 3 |
| Volume analysis notes | Module 2 |
| Bar analysis / colour coding | Module 2 |
| Top-down analysis watchlist | Module 1 |
| Trading plan builder | Module 1 – Section 2 |
| Win/Loss and Profit/Loss Ratio | Module 3 – Section 3 |
| Expectancy calculation | Module 3 – Section 3 |
| Back-testing journal | Module 3 |
| Money management rules | Module 1 |
| Australian FY P&L (1 July) | All modules |

---

## Optuma Integration (Future)

The platform includes placeholder fields and notes for Optuma charting software integration as referenced in Module 3 Appendices. Trading plan PDF exports include an Optuma reference section.

---

## Security

- All passwords hashed by Supabase Auth (bcrypt)
- Row Level Security on every table — users cannot access other users' data
- API routes include security headers (X-Frame-Options, X-Content-Type-Options)
- Admin role required for admin dashboard access
- Input validation with Zod on all forms
