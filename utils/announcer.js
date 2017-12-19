const RECENT_DONATION = 'RECENT_DONATION'
const LEADERBOARD = 'LEADERBOARD'
const TIER_REACHED = 'TIER_REACHED'
const TOTAL_DONATION_VALUE = 'TOTAL_DONATION_VALUE'

module.exports = (http) => {
  const io = require('socket.io')(http)

  return {
    io,
    announceTotalDonationValue: (value, inUSD) => {
      io.emit(TOTAL_DONATION_VALUE, {
        value: value.toString(),
        inUSD: inUSD.toString(),
      })
    },
    announceTierReached: (tier) => {
      io.emit(TIER_REACHED, { tier })
    },
    announceLeaderboard: (leaderboard) => {
      io.emit(LEADERBOARD, { leaderboard })
    },
    anounceRecentDonation: (tx) => {
      io.emit(RECENT_DONATION, {
        donor: tx.donor,
        value: tx.value.toString(),
      })
    },
  }
}
