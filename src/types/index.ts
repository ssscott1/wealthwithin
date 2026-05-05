export type Role = 'student' | 'admin'
export type SubscriptionLevel = 'diploma_student' | 'graduate' | 'instructor'
export type AccountType = 'live' | 'paper' | 'super' | 'options' | 'other'
export type TradeDirection = 'buy' | 'sell'
export type PortfolioType = 'growth' | 'income' | 'balanced' | 'speculative'
export type TimeFrame = 'short_term' | 'medium_term' | 'long_term'
export type RiskLevel = 'conservative' | 'moderate' | 'aggressive'

export type Strategy =
  | 'dows_trend_theory'
  | 'ganns_swing_theory'
  | 'ganns_trend_theory'
  | 'ganns_counter_trend_theory'
  | 'trend_line_theory'
  | 'combination'

export type EntryMethod =
  | 'swing_low_confirmed'
  | 'swing_high_confirmed'
  | 'trend_line_support_bounce'
  | 'trend_line_resistance_break'
  | 'counter_trend_reversal_volume'
  | 'gann_angle_support'
  | 'double_bottom'
  | 'double_top'
  | 'other'

export interface User {
  id: string
  email: string
  name: string
  photo_url?: string
  role: Role
  subscription_level: SubscriptionLevel
  preferred_broker?: string
  tax_year_start: string // e.g. "07-01" for 1 July
  dark_mode: boolean
  created_at: string
}

export interface TradingAccount {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  broker?: string
  currency: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface Trade {
  id: string
  account_id: string
  user_id: string
  ticker: string
  company_name: string
  direction: TradeDirection
  trade_date: string
  quantity: number
  price_per_share: number
  broker_fee: number
  total_cost: number // calculated: qty * price + fee (buy) or qty * price - fee (sell)
  strategy: Strategy
  entry_method?: EntryMethod
  exit_rules_applied?: string
  risk_percent?: number
  stop_loss_level?: number
  stop_loss_reason?: string
  volume_analysis_notes?: string
  bar_analysis_notes?: string
  comments?: string
  // Calculated fields (not stored)
  realised_pnl?: number
  created_at: string
  updated_at: string
}

export interface Holding {
  id: string
  account_id: string
  ticker: string
  company_name: string
  quantity: number
  average_purchase_price: number
  total_cost: number
  first_purchase_date: string
  // Live data fields
  current_price?: number
  current_value?: number
  unrealised_pnl?: number
  unrealised_pnl_percent?: number
}

export interface TradingPlan {
  id: string
  account_id: string
  user_id: string
  portfolio_type: PortfolioType
  time_frame: TimeFrame
  markets_traded: string[]
  strategies: Strategy[]
  money_management_rules: string
  max_risk_per_trade_percent: number
  position_sizing_method: string
  risk_level: RiskLevel
  psychology_notes: string
  top_down_analysis_notes: string
  backtesting_notes: string
  backtesting_win_rate?: number
  backtesting_profit_loss_ratio?: number
  additional_notes: string
  updated_at: string
  created_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  ticker: string
  company_name: string
  sector?: string
  // Fundamental
  pe_ratio?: number
  market_cap?: string
  dividend_yield?: number
  fundamental_notes?: string
  // Technical
  trend_direction?: 'uptrend' | 'downtrend' | 'sideways'
  key_support_level?: number
  key_resistance_level?: number
  technical_notes?: string
  // WW specific
  strategy_alignment?: Strategy
  priority: 'high' | 'medium' | 'low'
  notes?: string
  added_at: string
  // Live
  current_price?: number
  price_change_percent?: number
}

export interface PerformanceStats {
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number // %
  loss_rate: number // %
  win_loss_ratio: number // wins/losses
  total_profit: number
  total_loss: number
  profit_loss_ratio: number // avg win / avg loss
  expectancy: number // (win_rate * avg_win) - (loss_rate * avg_loss)
  total_realised_pnl: number
  total_unrealised_pnl: number
  ytd_pnl: number
  largest_win: number
  largest_loss: number
  avg_win: number
  avg_loss: number
}

export interface StockPrice {
  ticker: string
  price: number
  change: number
  change_percent: number
  volume?: number
  market_cap?: number
  last_updated: string
}

export interface BacktestEntry {
  id: string
  user_id: string
  account_id: string
  ticker: string
  entry_date: string
  exit_date: string
  entry_price: number
  exit_price: number
  quantity: number
  strategy: Strategy
  result: 'win' | 'loss' | 'breakeven'
  pnl: number
  notes?: string
  created_at: string
}
