var hat = require('hat')
var Buffer = require('safe-buffer').Buffer

var SIZE_BYTES = 20

module.exports = peerid

/**
 * generate peer id / node id
 * @param {[string|buffer]} prefix - prefix for peer id
 * @return {Buffer}
 */
function peerid(prefix) {
  return is_str(prefix) ?
         concat(Buffer.from(prefix), random_hash()) :
          is_buf(prefix) ?
          concat(prefix, random_hash()) :
          random_hash()
}

function random_hash() {
  return Buffer.from(hat(160), 'hex')
}

function is_str(s) {
  return typeof s === 'string'
}

function is_buf(b) {
  return Buffer.isBuffer(b)
}

function concat() {
  var args = [].slice.call(arguments)

  return Buffer.concat(args, SIZE_BYTES)
}