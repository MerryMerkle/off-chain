const fetch = require('isomorphic-fetch')

module.exports = {
  getTransactions: async (address) => {
    // eslint-disable-next-line max-len
    const res = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc`)

    const data = await res.json()
    return data.result
  },
}
