## peerid
[![travis](https://travis-ci.org/ReklatsMasters/peerid.svg)](https://travis-ci.org/ReklatsMasters/peerid)
[![npm](https://img.shields.io/npm/v/peerid.svg)](https://npmjs.org/package/peerid)
[![license](https://img.shields.io/npm/l/peerid.svg)](https://npmjs.org/package/peerid)
[![downloads](https://img.shields.io/npm/dm/peerid.svg)](https://npmjs.org/package/peerid)
[![Test Coverage](https://codeclimate.com/github/ReklatsMasters/peerid/badges/coverage.svg)](https://codeclimate.com/github/ReklatsMasters/peerid/coverage)

Generate peer id / node id for dht / bt node

### Usage

```js
const BtClient = require('bittorrent-tracker')
const peerid = require('peerid')

const client = new BtClient(peerid(), 6881 /*, torrent file */)
// do some ...

peerid('-UT1800-')  // with prefix
```

### API

##### `peerid([prefix: String|Buffer]): Buffer`
Generate random peer id / node id

### License
MIT, © Dmitry Tsvettsikh