const Tracker = require('bittorrent-tracker');

const trackerScrape = (info_hash, trackers, peer_id, peer_port, scrape_timeout) => {
	return new Promise((resolve, reject) => {
        //console.log('trackerScrape');
        //console.log('trackers', trackers);

        let result = {'seeders': 0, 'leechers': 0};

        if (!trackers.length) {
            //console.log('no trackers');
            resolve(result);
            return;
        }

        try {

            let peers = [];
            let finished = 0;

            let options = {
                infoHash: info_hash,
                announce: trackers,
                peerId: peer_id,
                port: peer_port
            };

            let client = new Tracker(options);

            client.on('error', (err) => {
                //console.error('error', err);
                finished++;
            });

            client.on('warning', (err) => {
                //console.error('warning', err);
                finished++;
            });

            // start getting peers from the tracker
            client.start();
            client.on('update', (data) => {
                //console.log('update',  data);
                finished++;
                peers.push(data);
            });

            /*
            // scrape peers from the tracker
            client.scrape();
            client.on('scrape', data => {
                console.log('scrape', data);
                peers.push(data);
            });
            */

            let sec = 0;
            let intervalInstance = setInterval(() => {
                //console.log('sec', sec);
                //console.log('finish', finished);

                if (finished >= trackers.length || sec == scrape_timeout) {

                    clearInterval(intervalInstance);

                    peers.forEach(tracker => {
                        //console.log('tracker', tracker);

                        if (tracker.complete > result.seeders)
                            result.seeders = tracker.complete;

                        if (tracker.incomplete > result.leechers)
                            result.leechers = tracker.incomplete;
                    });

                    //console.log('requesting from trackers complete. stoped torrent tracker client.')
                    //client.stop();
                    client.destroy();
                    resolve(result);
                }

                sec++;

            }, 1000);
        }
        catch(err) {
            //console.log('error', err);
            resolve(result);
        }
    });
}

/*
const createPeerId = require('peerid');
const peerId = createPeerId('-UT1800-');
const peerPort = Math.floor(Math.random() * (9000 - 1000) + 1000); // random port
const scrapeTimeout = 10; // seconds
const infoHash = '79ee9fc6ebe4bb7ebf4a0203407fa5485fabe4de';
const trackerList = ['http://bttracker.debian.org:6969/announce'];
trackerScrape(infoHash, trackerList, peerId, peerPort, scrapeTimeout
).then(data => {
    console.log('data', data);
})
.catch(err => {
    console.log('error', err);
});
*/

module.exports = trackerScrape;