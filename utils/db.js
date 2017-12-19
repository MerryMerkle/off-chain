const { Client, types } = require('pg')
const NUMERIC_OID = 1700
const BigNumber = require('bignumber.js')

types.setTypeParser(NUMERIC_OID, (v) => {
  return v === null ? null : new BigNumber(v)
})

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

const connect = Promise.resolve().then(() => {
  return client.connect()
})

module.exports = {
  /**
   * updates total, returns new
   */
  updateTotalDonationValue: async (value) => {
    await connect

    // update in db
    await client.query(`
      UPDATE total_donations
      SET value = value + $1
      WHERE id = 0
    `, [value.toString()])

    // return new
    const res = await client.query(`
      SELECT value
      FROM total_donations
      WHERE id = 0
      LIMIT 1
    `)

    return new BigNumber(res.rows[0].value)
  },

  /**
   * updates aggregate for single donor
   */
  updateAggregateDonation: async ({ donor, value }) => {
    await connect

    // update for a donor
    await client.query(`
      UPDATE aggregate_donations
      SET value = value + $1
      WHERE donor = $2
    `, [value.toString(), donor])
  },

  /**
   * Returns the top n aggregate donors, paied with names
   */
  getLeaderboard: async (n = 50) => {
    await connect

    const res = await client.query(`
      SELECT name, a.donor, value
      FROM aggregate_donations AS a
      LEFT JOIN names AS n ON a.donor = n.donor
      ORDER BY VALUE DESC
      LIMIT ${n}
    `)

    return res.rows
  },

  /**
   * adds a donation to the list
   */
  addDonation: async ({ donor, value, txHash }) => {
    await connect

    await client.query(`
      INSERT INTO donations (donor, value, tx_hash, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [donor, value.toString(), txHash]
    )
  },
}