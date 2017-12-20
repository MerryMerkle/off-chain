const BigNumber = require('bignumber.js')

const event = (name, extra = {}) => JSON.stringify({ event: name, ...extra })
const parseMessage = (handler) => (message) => handler(JSON.parse(message.data))

// eslint-disable-next-line promise/avoid-new
const timeout = async (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const startPinging = (ws) => {
  const interval = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(event('ping'))
    }
  }, 20 * 1000)

  return () => clearInterval(interval)
}

// add our custom names and convert values and stuff
const formatTx = (tx) => {
  return {
    ...tx,
    donor: tx.from.toLowerCase(),
    txHash: tx.hash,
    value: new BigNumber(tx.value),
  }
}

module.exports = {
  event,
  parseMessage,
  startPinging,
  timeout,
  formatTx,
}
