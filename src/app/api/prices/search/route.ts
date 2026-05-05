import { NextRequest, NextResponse } from 'next/server'
import { searchTicker } from '@/lib/prices'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) return NextResponse.json([])

  const results = await searchTicker(q)
  return NextResponse.json(results.slice(0, 8))
}
