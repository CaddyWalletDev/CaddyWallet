import fetch from 'node-fetch'

export interface TokenPair {
  baseSymbol: string
  quoteSymbol: string
  liquidity: number
  pairAddress: string
}

const DEX_SCREENER_API =
  process.env.DEX_SCREENER_API_URL || 'https://api.dexscreener.com/latest/dex/pairs'

export async function fetchDexTokenPairs(
  chain: string = 'solana',
  limit: number = 50
): Promise<TokenPair[]> {
  const url = `${DEX_SCREENER_API}/${chain}?limit=${limit}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`DexScreener API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  const rawPairs = Array.isArray(json.pairs) ? json.pairs : []

  return rawPairs.map((p: any): TokenPair => ({
    baseSymbol: p.baseToken?.symbol ?? '',
    quoteSymbol: p.quoteToken?.symbol ?? '',
    liquidity: Number(p.liquidity) || 0,
    pairAddress: p.pairAddress ?? '',
  }))
}
