const scrapeTracker = require('./tracker.js');
const scrapeDht = require('./dht.js');

const getPeers = (info_hash, tracker_list, peer_id, peer_port, scrape_timeout) => {
    return new Promise((resolve, reject) => {
        //console.log('getPeers');

        scrapeTracker(info_hash, tracker_list, peer_id, peer_port, scrape_timeout)
        .then(async data => {
            //console.log('data', data);

            let seeders = data.seeders;
            let leechers = data.leechers;

            let is_tracker = tracker_list.length ? true : false;
            let is_dht = !seeders ? true : false;

            // by no seeders run dht
            if (is_dht) {

                await scrapeDht(info_hash, peer_id, peer_port, scrape_timeout)
                .then(data => {
                    //console.log('data', data);

                    if (data.seeders > seeders)
                        seeders = data.seeders;

                    if (data.leechers > leechers)
                        leechers = data.leechers;
                })
                .catch(err => {
                    //console.error('error', err);
                });
            }

			let result = {'tracker': is_tracker, 'dht': is_dht, 'scrape': {'seeders': seeders, 'leechers': leechers}};
			//console.log('result', result);

            resolve(result);
        })
        .catch(err => {
			//console.error('error', err);
            reject(err);
        });
    });
}

module.exports = getPeers;