
import { fetchDexTokenPairs, TokenPair } from './dexPairFetcher'

export interface TrendingToken {
  symbol: string
  volume24h: number
  priceChangePercent: number
  pairAddress: string
}

export async function fetchTrendingSolanaTokens(
  topN: number = 20
): Promise<TrendingToken[]> {
  // first get pairs, then sort by volume
  const pairs: TokenPair[] = await fetchDexTokenPairs('solana', 200)

  // fetch individual pair stats
  const tokens: TrendingToken[] = pairs.map(p => ({
    symbol: p.baseSymbol,
    volume24h: p.liquidity,         // using liquidity as proxy for volume
    priceChangePercent: 0,          // placeholder, will fill below
    pairAddress: p.pairAddress
  }))

  // enrich with price-change data from DexScreener detail endpoint
  await Promise.all(tokens.map(async t => {
    const detailUrl = `${process.env.DEX_SCREENER_API_URL}/pair/${t.pairAddress}`
    const res = await fetch(detailUrl)
    if (res.ok) {
      const info = await res.json()
      t.priceChangePercent = Number(info.priceChangePercent24h ?? 0)
    }
  }))

  // sort by 24h volume desc
  tokens.sort((a, b) => b.volume24h - a.volume24h)

  return tokens.slice(0, topN)
}
