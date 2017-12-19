
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
const WebSocket = require('ws')
const db = require('./utils/db')
const announcer = require('./utils/announcer')(http)

const {
  event,
  parseMessage,
  startPinging,
  timeout,
  formatTx,
} = require('./utils')

const handleDonationTransactions = async (txs) => {
  for (let i = 0; i < txs.length; i++) {
    const tx = formatTx(txs[i])

    // add this tx to the donations list
    await db.addDonation(tx)

    // announce to most recent donation emitter
    announcer.anounceRecentDonation(tx)

    // update aggregate
    await db.updateAggregateDonation(tx)

    // re-announce leaderboard
    announcer.announceLeaderboard(await db.getLeaderboard())

    // update total amount
    const total = await db.updateTotalDonationValue(tx.value)

    // announce
    announcer.announceTotalDonationValue(total)

    // wait some time between txs to allow display on the frontend
    await timeout(1000)
  }
}

const etherscan = new WebSocket('wss://socket.etherscan.io/wshandler', {

})

etherscan.onopen = () => {
  etherscan.send(event('txlist', {
    address: process.env.DONATION_ADDRESS,
  }))
}
etherscan.onerror = (err) => {
  console.error(err)
  process.exit(1)
}
etherscan.onmessage = parseMessage((message) => {
  console.log(message)
  switch (message.event) {
  case 'txlist': {
    handleDonationTransactions(message.result)
      .catch((err) => {
        console.error(err)
        process.exit(1)
      })
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

announcer.io.on('connection', async (socket) => {
  // @TOOD - abstract this constant better
  socket.emit('LEADERBOARD', {
    leaderboard: await db.getLeaderboard(),
  })
  socket.emit('TOTAL_DONATION_VALUE', {
    // @TODO - replace with select instead of increment
    value: (await db.updateTotalDonationValue(0)).toString(),
  })
})

http.listen(process.env.PORT || 3000, function () {
  console.log('listening on *:3000')
})
