

import fetch from 'node-fetch'

export interface TokenData {
  symbol: string
  name: string
  priceUsd: number
  marketCapUsd: number
  volume24hUsd: number
  liquidityUsd: number
}


export async function retrieveDexTokenData(
  tokenAddress: string
): Promise<TokenData> {
  const url = `${process.env.DEX_SCREENER_API_URL}/token/${tokenAddress}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch token data: ${res.status}`)
  }

  const body = await res.json()
  // map API fields to our interface
  const data: TokenData = {
    symbol: body.symbol,
    name: body.name,
    priceUsd: Number(body.priceUsd),
    marketCapUsd: Number(body.marketCapUsd),
    volume24hUsd: Number(body.volume24hUsd),
    liquidityUsd: Number(body.liquidityUsd)
  }

  return data
}
