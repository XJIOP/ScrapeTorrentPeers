const scrape = require('./scrape.js');
const createPeerId = require('peerid');
const express = require ('express');
const app = express();
const router = express.Router();

// config
const accessKey = 'qwerty';
const appPort = 8585;
const peerId = createPeerId('-UT1800-');
const peerPort = Math.floor(Math.random() * (9000 - 1000) + 1000); // random port
const scrapeTimeout = 10; // seconds
const scrapeType = 'auto'; // auto, tracker, dht, both
const dhtFalsity = 0; // percent (recommended no more than 1-3)

const stats = {tracker: 0, dht: 0, active: 0, errors: 0, last_access: '--', started: Date.now()};
const types = ['auto', 'tracker', 'dht', 'both'];
const session = [];

app.use(router);
app.listen(appPort);

app.use(function(req, res) {
	res.status(404).send();
});

/*
 * GET REQUEST: /scrape?access_key=&info_hash=&announce_list=
 * access_key = (string) (required)
 * scrape_type = (string) (auto, tracker, dht, both)
 * info_hash = (string) (required)
 * announce_list = (json array without index)
 *
 */

router.get('/scrape', function(req, res) {

	if (accessKey != req.query.access_key) {
		res.status(404).send();
		return;
	}

    let scrape_type = types.includes(req.query.scrape_type) ? req.query.scrape_type : scrapeType;
	let info_hash = req.query.info_hash;
	let announce_list = [];

    try {
        announce_list = JSON.parse(req.query.announce_list);
    }
    catch(err) {}

	if (info_hash == null) {
		res.send('{"error":"missing info_hash"}');
		return;
	}

	if (info_hash.length != 40) {
		res.send('{"error":"wrong info_hash length (' + info_hash.length + ')"}');
		return;
	}

    if (session.includes(info_hash)) {
        res.send('{"error":"multiple session"}');
        return;
    }

    session.push(info_hash);

    scrape(info_hash, announce_list, peerId, peerPort, scrapeTimeout, scrape_type, dhtFalsity)
    .then(data => {
        //console.log('data', data);

        if (data.scrape.tracker) stats.tracker++;
        if (data.scrape.dht) stats.dht++;
        stats.last_access = getDateTime();

        removeFromArray(session, info_hash);

        res.send(data);
    })
    .catch(err => {
        //console.error('error', err);
        stats.errors++;
        res.send('{"error":"' + err.message + '"}');
    });
});

/*
 * GET REQUEST: /stats?access_key=
 * access_key = (string)
 *
 */

router.get('/stats', function(req, res) {

	if (accessKey != req.query.access_key) {
		res.status(404).send();
		return;
	}

    let result = JSON.parse(JSON.stringify(stats)); // clone object
    result.active = session.length;
    result.uptime = countUpFromTime(result.started);
    result.started = getDateTime(result.started);

	res.send(result);
});

const removeFromArray = (arr, value) => {
    let index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}

const countUpFromTime = (source) => {

	let time = new Date(source).getTime();
	let now = new Date();
	let dt = new Date(time);
	let timeDiff = (now - dt);

	let secInADay = 60 * 60 * 1000 * 24;
	let secInAHour = 60 * 60 * 1000;

	let d = Math.floor(timeDiff / (secInADay) * 1);
	let h = Math.floor((timeDiff % (secInADay)) / (secInAHour) * 1);
	let m = Math.floor(((timeDiff % (secInADay)) % (secInAHour)) / (60 * 1000) * 1);
	let s = Math.floor((((timeDiff % (secInADay)) % (secInAHour)) % (60 * 1000)) / 1000 * 1);

	return d + ' days ' + h + ' hours ' + m + ' minutes ' + s + ' seconds';
}

const getDateTime = (source) => {

    let now = source ? new Date(source) : new Date();
    let date = ('0' + now.getDate()).slice(-2);
    let month = ('0' + (now.getMonth() + 1)).slice(-2);
    let year = now.getFullYear();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    let result = date + '.' + month + '.' + year + ' ' + hours + ':' + minutes + ':' + seconds;

    return result;
}