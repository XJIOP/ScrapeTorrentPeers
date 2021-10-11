const DistributedHashTable = require('bittorrent-dht');
const BittorrentProtocol = require('bittorrent-protocol');
const TorrentDiscovery = require('torrent-discovery');
const ParseTorrent = require('parse-torrent');
const Net = require('net');
const UtP = require('ut_pex');
const UtM = require('ut_metadata');

class Client {
    constructor() {
        this.DHT = new DistributedHashTable();
		this.peerId = null;
        this.torrent = null;
    }
    setData(info_hash, peer_id, peer_port) {
		this.peerId = peer_id;
        this.torrent = new Torrent(info_hash, this, peer_port);
        this.torrent.discover();
    }
}

class Torrent {
    constructor(info_hash, client, peer_port) {
        this.infoHash = info_hash;
        this.client = client;
        this.discovery = null;
        this.metadata = null;
        this.peers = [];
		this.port = peer_port;
    }
    discover() {
        this.discovery = new TorrentDiscovery({
            infoHash: this.infoHash,
            peerId: this.client.peerId,
            dht: this.client.DHT,
            tracker: false,
            port: this.port
        })
        this.discovery.on('peer', this._onPeer.bind(this));
    }

    _onPeer(address) {
        let [host, port] = address.split(':');
        let Peer = {host: host, port: port};
        this._connectPeer(Peer);
    }

    _connectPeer(PeerAddress) {
        //console.log('new peer', PeerAddress);

        if (PeerAddress.port < 1000)
            return;

        let match = false;
        this.peers.forEach((peer) => {
            if (peer.host === PeerAddress.host) {
                match = true;
            }
        })
        if (!match) {
            let peer = new Peer(PeerAddress, this);
            this.peers.push(peer);
        }
    }
}

class Peer {
    constructor(address, torrent) {
        this.host = address.host;
        this.port = address.port;
        this.torrent = torrent;

        this.bitfield = null;
        this.pieces = null;

        this.wire = null;
        this.conn = null;

        this.connect();
    }

    connect() {
        //console.log('connect to peer', this.host + ':' + this.port);

        this.wire = new BittorrentProtocol();
        this.wire.use(UtP());
        this.wire.ut_pex.on('peer', this.torrent._connectPeer.bind(this.torrent));

        this.wire.use(UtM());
        this.wire.ut_metadata.on('metadata', this._onMetadata.bind(this));
        this.wire.on('bitfield', this._onBitfield.bind(this));

        this.conn = new Net.createConnection({host: this.host, port: this.port});
        this.conn.on('error', (err) => {
            //console.log('remove peer', this.torrent.peers.indexOf(this));
            this.torrent.peers.splice(this.torrent.peers.indexOf(this), 1);
        })
        this.conn.pipe(this.wire).pipe(this.conn);
        this.wire.handshake(this.torrent.infoHash, this.torrent.client.peerId, {dht: true});

        if (!this.torrent.metadata) {
            this.wire.ut_metadata.fetch();
        }
    }

    _onMetadata(meta) {
        try {
            let metadata = ParseTorrent(meta);
            this.torrent.metadata = metadata;
            for (let peer of this.torrent.peers) {
                if (peer.wire && peer.wire.ut_metadata)
                    peer.wire.ut_metadata.cancel();
            }
        }
        catch(err) {
            //console.error('metadata failure', err);
        }
    }

    _onBitfield(bitfield) {
        //console.log('_onBitfield');

        this.bitfield = bitfield;
        let have = 0;
        for (let i=0; i < bitfield.buffer.length << 3; i++) {
            if (bitfield.get(i) === true) {
                have++;
            }
        }
        this.pieces = have;
    }
}

const peerDestroy = (peer) => {
    try {
        peer.wire.destroy()
        peer.conn.end();
        peer.conn.destroy();
    }
    catch(err) {}
}

const dhtScrape = (info_hash, peer_id, peer_port, scrape_timeout) => {
    return new Promise((resolve, reject) => {
        //console.log('dhtScrape');

        try {

            let client = new Client();
            client.setData(info_hash, peer_id, peer_port);

            let sec = 0;
            let intervalInstance = setInterval(() => {
                //console.log('sec', sec);
                //console.log('peers', client.torrent.peers.length);

                if ((client.torrent.metadata && client.torrent.peers.length) || sec == scrape_timeout) {

                    clearInterval(intervalInstance);
                    client.torrent.discovery.destroy();
                    client.DHT.destroy();

                    let seeders = 0;
                    let leechers = 0;

                    client.torrent.peers.forEach((peer, i) => {
                        //console.log('peer', i);

                        if (peer) {
                            //console.log('peer.pieces', peer.pieces);

							if (client.torrent.metadata) {

								if (peer.pieces === client.torrent.metadata.pieces.length)
									seeders++;
								else
									leechers++;
							}

                            peerDestroy(peer);
                        }
                    });

					let result = {'seeders': seeders, 'leechers': leechers};
                    resolve(result);
                }

                sec++;

            }, 1000);
        }
        catch(err) {
            //console.error('error', err);
            reject(err);
        }
    });
}

/*
const createPeerId = require('peerid');
const peerId = createPeerId('-UT1800-');
const peerPort = Math.floor(Math.random() * (9000 - 1000) + 1000); // random port
const scrapeTimeout = 10; // seconds
const infoHash = '79ee9fc6ebe4bb7ebf4a0203407fa5485fabe4de';
dhtScrape(infoHash,	peerId, peerPort, scrapeTimeout).then(data => {
    console.log('data', data);
})
.catch(err => {
    console.error('error', err);
});
*/

module.exports = dhtScrape;