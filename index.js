
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
const BigNumber = require('bignumber.js')
const cors = require('cors')
const bodyParser = require('body-parser').urlencoded({})
const app = require('express')()
const http = require('http').Server(app)
const WebSocket = require('ws')
const db = require('./utils/db')
const announcer = require('./utils/announcer')(http)
const gdax = require('./utils/gdax')
const recoverAddress = require('./utils/recoverAddress')

app.use(cors({
  origin: '*',
}))

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

    // re-announce leaderboards
    const top50 = await db.getLeaderboard(50)
    announcer.announceLeaderboard(top50)
    announcer.announceTreeLeaderboard(top50.slice(0, 31))

    // update total amount
    const total = await db.updateTotalDonationValue(tx.value)

    // get cad value
    const toCAD = await gdax.ethInCAD()

    // announce
    announcer.announceTotalDonationValue(total, total.times(toCAD))

    // did we reach a new tier?
    const tierId = await db.getNewTier(toCAD)
    if (tierId !== null) {
      announcer.announceTierReached(tierId)
    }

    // wait some time between txs to allow display on the frontend
    await timeout(8 * 1000)
  }
}

const etherscan = new WebSocket('ws://socket.etherscan.io/wshandler', {

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

announcer.io.on('connection', async (socket) => {
  const top50 = await db.getLeaderboard(50)
  // @TOOD - abstract this logic better
  socket.emit('LEADERBOARD', { leaderboard: top50 })

  socket.emit('TREE_LEADERBOARD', { leaderboard: top50.slice(0, 31) })

  // update total amount - fix this to just getter
  const total = await db.updateTotalDonationValue(new BigNumber(0))

  // get cad value
  const toCAD = await gdax.ethInCAD()

  socket.emit('TOTAL_DONATION_VALUE', {
    value: total.toString(),
    inCAD: total.times(toCAD).toString(),
  })
})

app.post('/name', bodyParser, async function (req, res) {
  if (!req.body) {
    return res.sendStatus(400)
  }

  try {
    const signedBy = recoverAddress(req.body.data, req.body.sig)
    if (signedBy === req.body.addr) {
      console.log('valid!', signedBy, req.body.name)
      await db.setName(signedBy, req.body.name)

      const top50 = await db.getLeaderboard(50)
      announcer.announceLeaderboard(top50)

      return res.sendStatus(200)
    } else {
      throw new Error('nope')
    }
  } catch (error) {
    console.error(error)
    return res.sendStatus(400)
  }
})

app.get('/', (req, res) => { res.json({ success: true }) })

http.listen(process.env.PORT || 3000, function () {
  console.log('listening on *:3000')
})

process.on('unhandledRejection', error => {
  console.log('unhandledRejection', error.message, error.stack)
})
