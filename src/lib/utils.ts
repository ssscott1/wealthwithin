import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy HH:mm')
  } catch {
    return dateStr
  }
}

/** Australian financial year starts 1 July */
export function getAustralianFYStart(date = new Date()): Date {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1
  return new Date(year, 6, 1) // July 1
}

export function getAustralianFYLabel(date = new Date()): string {
  const fyStart = getAustralianFYStart(date)
  return `FY${String(fyStart.getFullYear()).slice(2)}/${String(fyStart.getFullYear() + 1).slice(2)}`
}

export function isInCurrentAustralianFY(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const fyStart = getAustralianFYStart()
  return date >= fyStart && date <= new Date()
}

export function strategyLabel(strategy: string): string {
  const map: Record<string, string> = {
    dows_trend_theory: "Dow's Trend Theory",
    ganns_swing_theory: "Gann's Swing Theory",
    ganns_trend_theory: "Gann's Trend Theory",
    ganns_counter_trend_theory: "Gann's Counter Trend Theory",
    trend_line_theory: 'Trend Line Theory',
    combination: 'Combination',
  }
  return map[strategy] ?? strategy
}

export function entryMethodLabel(method: string): string {
  const map: Record<string, string> = {
    swing_low_confirmed: 'Swing Low Confirmed',
    swing_high_confirmed: 'Swing High Confirmed',
    trend_line_support_bounce: 'Trend Line Support Bounce',
    trend_line_resistance_break: 'Trend Line Resistance Break',
    counter_trend_reversal_volume: 'Counter-Trend Reversal with Volume Spike',
    gann_angle_support: 'Gann Angle Support',
    double_bottom: 'Double Bottom',
    double_top: 'Double Top',
    other: 'Other',
  }
  return map[method] ?? method
}

export function accountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    live: 'Live Trading',
    paper: 'Paper / Demo',
    super: 'Super Fund',
    options: 'Options',
    other: 'Other',
  }
  return map[type] ?? type
}

export function calculateWeightedAverage(
  existingQty: number,
  existingAvgPrice: number,
  newQty: number,
  newPrice: number
): number {
  const totalQty = existingQty + newQty
  if (totalQty === 0) return 0
  return (existingQty * existingAvgPrice + newQty * newPrice) / totalQty
}
