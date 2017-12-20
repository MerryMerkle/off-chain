var ethsigutil = require('eth-sig-util');
var util = require('ethereumjs-util');

module.exports = function (msg, sig) {
	return '0x' + util.pubToAddress(ethsigutil.extractPublicKey({data: msg, sig: sig})).toString('hex');
}