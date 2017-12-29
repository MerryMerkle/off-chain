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
const etherscanApi = require('./utils/etherscan')

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

    if (process.env.YES_TREE) {
      // wait some time between txs to allow display on the frontend
      await timeout(8 * 1000)
    }
  }
}

/**
 * fast forward
 */

console.log('fast forwarding if necessary...')

const fastForward = async () => {
  const txs = await etherscanApi.getTransactions(process.env.DONATION_ADDRESS)
  const lastDonationTxHash = await db.getLastDonation()

  console.log(`Fetched. Looking for donations after ${lastDonationTxHash}`)

  const unseenDonations = []
  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i]
    if (tx.hash === lastDonationTxHash) {
      break
    }

    unseenDonations.push(tx)
  }

  console.log(`working on ${unseenDonations.length} donations`)

  await handleDonationTransactions(unseenDonations)
}

const rebuildDatabase = async () => {
  console.log('Nuking...')
  // nuke the db of donation-related artifacts
  await db.softNuke()

  console.log('        Nuked.')

  console.log('Scanning...')
  // ask etherscan for all the transactions
  const txs = await etherscanApi.getTransactions(process.env.DONATION_ADDRESS)

  console.log(`           found ${txs.length} transactions. Latest is ${txs[0].hash}`)

  await handleDonationTransactions(txs)

  console.log('Done rebuilding. Adding Polychain')

  // hardcode polychain
  const polychainValue = (new BigNumber(18.5)).mul(10 ** 18)
  await db.updateAggregateDonation({
    donor: 'polychain',
    value: polychainValue,
  })
  await db.updateTotalDonationValue(polychainValue)
  await db.setName('polychain', 'Polychain Capital Team')

  console.log('Done')
}

const main = async () => {
  if (process.env.FAST_FORWARD) {
    await fastForward()
  }

  if (process.env.REBUILD_DB) {
    await rebuildDatabase()
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

/**
 * NORMAL MONITORING STUFF
 */

const activeListen = () => {
  const etherscan = new WebSocket('ws://socket.etherscan.io/wshandler', {})

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
}

if (!process.env.NO_LISTEN) {
  activeListen()
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

process.on('unhandledRejection', error => {
  console.log('unhandledRejection', error.message, error.stack)
})

http.listen(process.env.PORT || 3000, function () {
  console.log('listening on *:3000')
})
