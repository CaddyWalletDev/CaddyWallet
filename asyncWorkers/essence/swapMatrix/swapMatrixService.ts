
import { SwapMatrix, SwapPair } from './swapMatrix'
import { PublicKey } from '@solana/web3.js'
import { SwapApi } from './swapApi'

export class SwapMatrixService {
  private api: SwapApi
  private calculator: SwapMatrix

  constructor(rpcUrl: string) {
    this.api = new SwapApi(rpcUrl)
    this.calculator = new SwapMatrix()
  }

  async buildMatrix(tokens: string[]): Promise<Record<string, Record<string, number>>> {
    const pairs: SwapPair[] = []
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        if (i !== j) pairs.push([tokens[i], tokens[j]])
      }
    }
    const rates = await Promise.all(
      pairs.map(([from, to]) =>
        this.api.getQuote({
          fromMint: new PublicKey(from),
          toMint: new PublicKey(to),
          amount: 1
        }).then(q => q.amountOut)
      )
    )
    const entries = this.calculator.compute(pairs, rates)
    return this.calculator.toGrid(entries)
  }
}
