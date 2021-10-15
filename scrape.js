const tracker = require('./tracker.js');
const dht = require('./dht.js');

const getPeers = (info_hash, tracker_list, peer_id, peer_port, scrape_timeout, scrape_type, dht_falsity) => {
    return new Promise(async (resolve, reject) => {
        //console.log('getPeers');

        try {

            let result = {
                'seeders': 0,
                'leechers': 0,
                'scrape': {'tracker': false, 'dht': false}
            };

            // scrape from tracker
            if(tracker_list.length && (scrape_type == 'auto' || scrape_type == 'tracker' || scrape_type == 'both')) {

                await tracker(info_hash, tracker_list, peer_id, peer_port, scrape_timeout)
                .then(data => {
                    //console.log('data from tracker', data);

                    result.scrape.tracker = true;

                    result.seeders = data.seeders;
                    result.leechers = data.leechers;
                })
                .catch(err => {
                    //console.error('error', err);
                });
            }

            // scrape from dht
            if((scrape_type == 'auto' && !result.seeders) || scrape_type == 'dht' || scrape_type == 'both') {

                await dht(info_hash, peer_id, peer_port, scrape_timeout, dht_falsity)
                .then(data => {
                    //console.log('data from dht', data);

                    result.scrape.dht = true;

                    if(data.seeders > result.seeders)
                        result.seeders = data.seeders;

                    if(data.leechers > result.leechers)
                        result.leechers = data.leechers;
                })
                .catch(err => {
                    //console.error('error', err);
                });
            }

            //console.log('result', result);
            resolve(result);
        }
        catch(err) {
            reject(err);
        }
    });
}

module.exports = getPeers;