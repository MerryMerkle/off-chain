
// { event: 'txlist',
//   address: '0xEC6d36A487d85CF562B7b8464CE8dc60637362AC',
//   result:
//    [ { blockNumber: '4754947',
//        timeStamp: '1513609371',
//        hash: '0x4fcc3b2fb9f5ccb959b980db45f26312a7b21d91f48f7d700df11c4ed1d006f3',
//        nonce: '141',
//        blockHash: '0x4c0fa6799bc3fca1865bcf10f8004067ccf62655a308a7a95cc0cbe4e44961c7',
//        transactionIndex: '177',
//        from: '0xec6d36a487d85cf562b7b8464ce8dc60637362ac',
//        to: '0xec6d36a487d85cf562b7b8464ce8dc60637362ac',
//        value: '0',
//        gas: '31500',
//        gasPrice: '4000000000',
//        input: '0x',
//        contractAddress: '',
//        cumulativeGasUsed: '7664979',
//        gasUsed: '21000',
//        confirmations: '6' } ] }

require('dotenv').config()
const path = require('path')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const WebSocket = require('ws')

const event = (name, extra = {}) => JSON.stringify({ event: name, ...extra })
const parseMessage = (handler) => (message) => handler(JSON.parse(message.data))

const startPinging = (ws) => {
  const interval = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(event('ping'))
    }
  }, 20 * 1000)

  return () => clearInterval(interval)
}

const handleDonationTransactions = (txs) => {
  txs.forEach((tx) => {

  })
}

const etherscan = new WebSocket('wss://socket.etherscan.io/wshandler', {

})

etherscan.onopen = () => {
  etherscan.send(event('txlist', {
    address: process.env.DONATION_ADDRESS,
  }))
}
etherscan.onerror = console.error.bind(console)
etherscan.onmessage = parseMessage((message) => {
  console.log(message)
  switch (message.event) {
  case 'txlist': {
    handleDonationTransactions(message.result)
    break
  }
  case 'subscribe-txlist': {
    switch (message.status) {
    case '1':
      console.log(`Watching transactions from ${message.message.split(' ')[1]}`)
      break
    case '0':
      console.error(message)
      process.exit(1)
      // break
    default:
      console.error('Unknown Status', message)
    }
    break
  }
  case 'pong':
    // ignore pongs
    break
  default:
    console.log('Unhandled message', message)
  }
})

const cancelPinger = startPinging(etherscan)
etherscan.onclose = () => {
  cancelPinger()
}

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'))
})

io.on('connection', function (socket) {
  console.log('a user connected')
})

http.listen(3000, function () {
  console.log('listening on *:3000')
})
