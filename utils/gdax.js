
const BigNumber = require('bignumber.js')
const cache = require('memory-cache')
const Gdax = require('gdax')
const publicClient = new Gdax.PublicClient('ETH-USD')

const KEY = 'ethusd'

module.exports = {
  publicClient,
  ethInUSD: async () => {
    const v = cache.get(KEY)
    if (v === null) {
      const res = await publicClient.getProductTicker()

      const value = new BigNumber(res.price)

      cache.put(KEY, value, 60 * 60 * 1000) // 1 hr

      return value
    }

    return v
  },
}
