const RECENT_DONATION = 'RECENT_DONATION'
const LEADERBOARD = 'LEADERBOARD'
const TREE_LEADERBOARD = 'TREE_LEADERBOARD'
const TIER_REACHED = 'TIER_REACHED'
const TOTAL_DONATION_VALUE = 'TOTAL_DONATION_VALUE'

module.exports = (http) => {
  const io = require('socket.io')(http)

  io.origins('*:*')

  return {
    io,
    announceTotalDonationValue: (value, inCAD) => {
      io.emit(TOTAL_DONATION_VALUE, {
        value: value.toString(),
        inCAD: inCAD.toString(),
      })
    },
    announceTierReached: (tier) => {
      io.emit(TIER_REACHED, { tier })
    },
    announceLeaderboard: (leaderboard) => {
      io.emit(LEADERBOARD, { leaderboard })
    },
    announceTreeLeaderboard: (leaderboard) => {
      io.emit(TREE_LEADERBOARD, { leaderboard })
    },
    anounceRecentDonation: (tx) => {
      io.emit(RECENT_DONATION, {
        donor: tx.donor,
        value: tx.value.toString(),
      })
    },
  }
}
