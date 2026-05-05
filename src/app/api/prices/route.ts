import { NextRequest, NextResponse } from 'next/server'
import { fetchMultipleStockPrices } from '@/lib/prices'

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get('tickers')
  if (!tickers) return NextResponse.json({})

  const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 30)
  const priceMap = await fetchMultipleStockPrices(tickerList)

  const result: Record<string, { price: number; change: number; change_percent: number }> = {}
  priceMap.forEach((priceData, ticker) => {
    result[ticker] = {
      price: priceData.price,
      change: priceData.change,
      change_percent: priceData.change_percent,
    }
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  })
}
