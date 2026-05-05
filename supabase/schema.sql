-- ============================================================
-- Wealth Within Trader – Database Schema
-- PostgreSQL (Supabase compatible)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE subscription_level AS ENUM ('diploma_student', 'graduate', 'instructor');
CREATE TYPE account_type AS ENUM ('live', 'paper', 'super', 'options', 'other');
CREATE TYPE trade_direction AS ENUM ('buy', 'sell');
CREATE TYPE portfolio_type AS ENUM ('growth', 'income', 'balanced', 'speculative');
CREATE TYPE time_frame AS ENUM ('short_term', 'medium_term', 'long_term');
CREATE TYPE risk_level AS ENUM ('conservative', 'moderate', 'aggressive');
CREATE TYPE strategy_type AS ENUM (
  'dows_trend_theory',
  'ganns_swing_theory',
  'ganns_trend_theory',
  'ganns_counter_trend_theory',
  'trend_line_theory',
  'combination'
);
CREATE TYPE entry_method_type AS ENUM (
  'swing_low_confirmed',
  'swing_high_confirmed',
  'trend_line_support_bounce',
  'trend_line_resistance_break',
  'counter_trend_reversal_volume',
  'gann_angle_support',
  'double_bottom',
  'double_top',
  'other'
);
CREATE TYPE watchlist_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE trend_direction AS ENUM ('uptrend', 'downtrend', 'sideways');
CREATE TYPE backtest_result AS ENUM ('win', 'loss', 'breakeven');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  photo_url     TEXT,
  role          user_role NOT NULL DEFAULT 'student',
  subscription_level subscription_level NOT NULL DEFAULT 'diploma_student',
  preferred_broker TEXT,
  tax_year_start TEXT NOT NULL DEFAULT '07-01',  -- MM-DD format
  dark_mode     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRADING ACCOUNTS
-- ============================================================
CREATE TABLE public.trading_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  account_type  account_type NOT NULL DEFAULT 'live',
  broker        TEXT,
  currency      TEXT NOT NULL DEFAULT 'AUD',
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own accounts"
  ON public.trading_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all accounts"
  ON public.trading_accounts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TRADES
-- ============================================================
CREATE TABLE public.trades (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticker                TEXT NOT NULL,
  company_name          TEXT NOT NULL DEFAULT '',
  direction             trade_direction NOT NULL,
  trade_date            DATE NOT NULL,
  quantity              NUMERIC(18, 4) NOT NULL CHECK (quantity > 0),
  price_per_share       NUMERIC(18, 6) NOT NULL CHECK (price_per_share > 0),
  broker_fee            NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_cost            NUMERIC(18, 2) NOT NULL,  -- computed in app layer
  strategy              strategy_type NOT NULL,
  entry_method          entry_method_type,
  exit_rules_applied    TEXT,
  risk_percent          NUMERIC(5, 2),
  stop_loss_level       NUMERIC(18, 6),
  stop_loss_reason      TEXT,
  volume_analysis_notes TEXT,
  bar_analysis_notes    TEXT,
  comments              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_account_id ON public.trades(account_id);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_ticker ON public.trades(ticker);
CREATE INDEX idx_trades_trade_date ON public.trades(trade_date DESC);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trades"
  ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades"
  ON public.trades FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- HOLDINGS (materialised view of current positions)
-- ============================================================
CREATE TABLE public.holdings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  ticker                TEXT NOT NULL,
  company_name          TEXT NOT NULL DEFAULT '',
  quantity              NUMERIC(18, 4) NOT NULL DEFAULT 0,
  average_purchase_price NUMERIC(18, 6) NOT NULL DEFAULT 0,
  total_cost            NUMERIC(18, 2) NOT NULL DEFAULT 0,
  first_purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, ticker)
);

CREATE INDEX idx_holdings_account_id ON public.holdings(account_id);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own holdings"
  ON public.holdings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trading_accounts WHERE id = account_id AND user_id = auth.uid())
  );

-- ============================================================
-- TRADING PLANS
-- ============================================================
CREATE TABLE public.trading_plans (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id                  UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  user_id                     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portfolio_type              portfolio_type NOT NULL DEFAULT 'growth',
  time_frame                  time_frame NOT NULL DEFAULT 'medium_term',
  markets_traded              TEXT[] NOT NULL DEFAULT ARRAY['ASX'],
  strategies                  strategy_type[] NOT NULL DEFAULT ARRAY['dows_trend_theory']::strategy_type[],
  money_management_rules      TEXT NOT NULL DEFAULT '',
  max_risk_per_trade_percent  NUMERIC(5, 2) NOT NULL DEFAULT 2,
  position_sizing_method      TEXT NOT NULL DEFAULT '',
  risk_level                  risk_level NOT NULL DEFAULT 'moderate',
  psychology_notes            TEXT NOT NULL DEFAULT '',
  top_down_analysis_notes     TEXT NOT NULL DEFAULT '',
  backtesting_notes           TEXT NOT NULL DEFAULT '',
  backtesting_win_rate        NUMERIC(5, 2),
  backtesting_profit_loss_ratio NUMERIC(8, 4),
  additional_notes            TEXT NOT NULL DEFAULT '',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE public.trading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own plans"
  ON public.trading_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all plans"
  ON public.trading_plans FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- WATCHLIST
-- ============================================================
CREATE TABLE public.watchlist (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ticker                TEXT NOT NULL,
  company_name          TEXT NOT NULL DEFAULT '',
  sector                TEXT,
  pe_ratio              NUMERIC(10, 4),
  market_cap            TEXT,
  dividend_yield        NUMERIC(6, 4),
  fundamental_notes     TEXT,
  trend_direction       trend_direction,
  key_support_level     NUMERIC(18, 6),
  key_resistance_level  NUMERIC(18, 6),
  technical_notes       TEXT,
  strategy_alignment    strategy_type,
  priority              watchlist_priority NOT NULL DEFAULT 'medium',
  notes                 TEXT,
  added_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticker)
);

CREATE INDEX idx_watchlist_user_id ON public.watchlist(user_id);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist"
  ON public.watchlist FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- BACKTESTING JOURNAL
-- ============================================================
CREATE TABLE public.backtest_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  ticker        TEXT NOT NULL,
  entry_date    DATE NOT NULL,
  exit_date     DATE NOT NULL,
  entry_price   NUMERIC(18, 6) NOT NULL,
  exit_price    NUMERIC(18, 6) NOT NULL,
  quantity      NUMERIC(18, 4) NOT NULL,
  strategy      strategy_type NOT NULL,
  result        backtest_result NOT NULL,
  pnl           NUMERIC(18, 2) NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backtest_user_id ON public.backtest_entries(user_id);
CREATE INDEX idx_backtest_account_id ON public.backtest_entries(account_id);

ALTER TABLE public.backtest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own backtest entries"
  ON public.backtest_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all backtest entries"
  ON public.backtest_entries FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- ADMIN: Convenience view for all trades with user info
-- ============================================================
CREATE VIEW public.admin_trades_view AS
  SELECT
    t.*,
    p.name AS user_name,
    p.email AS user_email,
    a.name AS account_name
  FROM public.trades t
  JOIN public.profiles p ON p.id = t.user_id
  JOIN public.trading_accounts a ON a.id = t.account_id;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_accounts_updated_at BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_trades_updated_at BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_holdings_updated_at BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_plans_updated_at BEFORE UPDATE ON public.trading_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
