const ethsigutil = require('eth-sig-util')
const ethjsutil = require('ethereumjs-util')

module.exports = (msg, sig) => {
  return '0x' + ethjsutil.pubToAddress(
    ethsigutil.extractPublicKey({ data: msg, sig: sig })
  ).toString('hex')
}
