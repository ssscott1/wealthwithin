import type { StockPrice } from '@/types'

/**
 * Fetches stock price data via Yahoo Finance (no API key required for basic quotes).
 * Swap this implementation for Polygon.io, Alpha Vantage, or any paid data provider.
 */
export async function fetchStockPrice(ticker: string): Promise<StockPrice | null> {
  try {
    // Yahoo Finance v8 quote endpoint (unofficial but widely used)
    const asxTicker = ticker.includes('.') ? ticker : `${ticker}.AX`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asxTicker)}?interval=1d&range=1d`
    const res = await fetch(url, {
      next: { revalidate: 300 }, // Cache 5 min
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const meta = result.meta
    const price = meta.regularMarketPrice ?? meta.previousClose
    const prevClose = meta.chartPreviousClose ?? meta.previousClose
    const change = price - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0
    return {
      ticker,
      price,
      change,
      change_percent: changePercent,
      volume: meta.regularMarketVolume,
      last_updated: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function fetchMultipleStockPrices(tickers: string[]): Promise<Map<string, StockPrice>> {
  const results = await Promise.allSettled(tickers.map(t => fetchStockPrice(t)))
  const map = new Map<string, StockPrice>()
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      map.set(tickers[i], result.value)
    }
  })
  return map
}

/** Search for a stock ticker/company name */
export async function searchTicker(query: string): Promise<{ ticker: string; name: string; exchange: string }[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.quotes ?? [])
      .filter((q: { quoteType: string }) => q.quoteType === 'EQUITY')
      .map((q: { symbol: string; longname?: string; shortname?: string; exchange: string }) => ({
        ticker: q.symbol.replace('.AX', ''),
        name: q.longname ?? q.shortname ?? q.symbol,
        exchange: q.exchange,
      }))
  } catch {
    return []
  }
}
