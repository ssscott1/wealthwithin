import type { Trade, Holding, PerformanceStats } from '@/types'
import { getAustralianFYStart } from './utils'

/**
 * Calculates comprehensive performance statistics from closed trades.
 * Implements Module 3 Section 3 metrics: win/loss ratio, profit/loss ratio, expectancy.
 */
export function calculatePerformanceStats(
  trades: Trade[],
  holdings?: Holding[]
): PerformanceStats {
  const fyStart = getAustralianFYStart()

  // Match buys and sells to find closed P&L
  const sellTrades = trades.filter(t => t.direction === 'sell')
  const buyTrades = trades.filter(t => t.direction === 'buy')

  // Simple FIFO P&L calculation per ticker
  const realisedPnls: number[] = []
  const ytdPnls: number[] = []

  // Group buys by ticker
  const buyQueues = new Map<string, Array<{ qty: number; price: number; date: string; fee: number }>>()
  buyTrades.forEach(t => {
    const q = buyQueues.get(t.ticker) ?? []
    q.push({ qty: t.quantity, price: t.price_per_share, date: t.trade_date, fee: t.broker_fee })
    buyQueues.set(t.ticker, q)
  })

  sellTrades.forEach(sell => {
    const queue = buyQueues.get(sell.ticker)
    if (!queue || queue.length === 0) return

    let remainingSellQty = sell.quantity
    const sellRevenue = sell.quantity * sell.price_per_share - sell.broker_fee

    let costBasis = 0
    while (remainingSellQty > 0 && queue.length > 0) {
      const buy = queue[0]
      const matchedQty = Math.min(remainingSellQty, buy.qty)
      const buyFeeAlloc = (matchedQty / (buy.qty + matchedQty - matchedQty)) * buy.fee
      costBasis += matchedQty * buy.price + buyFeeAlloc
      buy.qty -= matchedQty
      remainingSellQty -= matchedQty
      if (buy.qty <= 0) queue.shift()
    }

    const pnl = sellRevenue - costBasis
    realisedPnls.push(pnl)

    const sellDate = new Date(sell.trade_date)
    if (sellDate >= fyStart) ytdPnls.push(pnl)
  })

  const wins = realisedPnls.filter(p => p > 0)
  const losses = realisedPnls.filter(p => p < 0)

  const totalWinAmount = wins.reduce((s, p) => s + p, 0)
  const totalLossAmount = losses.reduce((s, p) => s + Math.abs(p), 0)
  const avgWin = wins.length > 0 ? totalWinAmount / wins.length : 0
  const avgLoss = losses.length > 0 ? totalLossAmount / losses.length : 0
  const winRate = realisedPnls.length > 0 ? wins.length / realisedPnls.length : 0
  const lossRate = 1 - winRate
  const profitLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0
  const expectancy = avgWin * winRate - avgLoss * lossRate

  const totalUnrealisedPnl = (holdings ?? []).reduce(
    (s, h) => s + (h.unrealised_pnl ?? 0), 0
  )

  return {
    total_trades: realisedPnls.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: winRate * 100,
    loss_rate: lossRate * 100,
    win_loss_ratio: losses.length > 0 ? wins.length / losses.length : wins.length,
    total_profit: totalWinAmount,
    total_loss: totalLossAmount,
    profit_loss_ratio: profitLossRatio,
    expectancy,
    total_realised_pnl: realisedPnls.reduce((s, p) => s + p, 0),
    total_unrealised_pnl: totalUnrealisedPnl,
    ytd_pnl: ytdPnls.reduce((s, p) => s + p, 0),
    largest_win: wins.length > 0 ? Math.max(...wins) : 0,
    largest_loss: losses.length > 0 ? Math.max(...losses) : 0,
    avg_win: avgWin,
    avg_loss: avgLoss,
  }
}
