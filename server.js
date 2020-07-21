const DHT = require('bittorrent-dht/client');
const Client = require('bittorrent-tracker/client');
const createPeerId = require('peerid');
const Protocol = require('bittorrent-protocol');
const net = require('net');
const express = require ('express'); 
const app = express();
const router = express.Router();

/* 
//parse torrent file
var parseTorrentFile = require('parse-torrent-file');
var path = require('path');
var fs = require('fs');

var torrent = fs.readFileSync('D:/test.torrent');
var parsed_torrent;
*/

var access_key = 'qwerty';

var debug = false;
var app_port = 8585;
var bt_port = 6881;
var dht_timeout = 2000;
var tracker_timeout = 2000;

var session = [];

var stats = {dht: 0, tracker: 0, last_access: null, started: Date.now()};

app.use(router);
app.listen(app_port); 

app.use(function(req, res) {
	res.status(404).send();
});

/*
 * GET REQUEST: /scrape?access_key=&info_hash=&announce_list=&pieces_length=
 * access_key = (string)
 * info_hash = ()
 * announce_list = (separated with comma, empty then will check only DHT)
 * pieces_length = (int) 
 * 
 */

router.get('/scrape', function(req, res) {    

	if(access_key != req.query.access_key) {
		res.status(404).send();
		return;
	}
	
	var info_hash = req.query.info_hash.toUpperCase();
	var announce_list = req.query.announce_list;
	var torrent_pieces_length = parseInt(req.query.pieces_length);
	
	if(info_hash == null) {
		res.send('{"error":"missing info_hash"}');
		return;
	}
	
	if(info_hash.length != 40) {
		res.send('{"error":"wrong info_hash length ('+info_hash.length+')"}');
		return;		
	}
	
	if(announce_list != null)
		announce_list = announce_list.split(',');
	else
		announce_list = [];
	
	if(!isNumeric(torrent_pieces_length)) {
		res.send('{"error":"missed torrent pieces length ('+torrent_pieces_length+')"}');
		return;
	} 

	/*
	// parse torrent file
	try {
		 parsed_torrent = parseTorrentFile(torrent);
	} catch(e) {
		// the torrent file was corrupt
		log('Torrent parse error', e);
		return;
	}

	var info_hash = parsed_torrent.infoHash.toUpperCase();
	var announce_list = parsed_torrent.announce;
	var torrent_pieces_length = parsed_torrent.pieces.length;
	*/	
	
	// check if session exist
	if(checkByKey(session, info_hash)) {
		res.send('{"error":"session has arleady exist"}');
		return;	
	}
		
	stats.last_access = new Date().toLocaleString();
	
	var announce_count = Object.keys(announce_list).length;
	
	session[info_hash] = {
			app: res,	
			client: null,
			lookup: true,
			peer_id: createPeerId('-UT1800-'),
			added: Date.now(),
			torrent: {
				info_hash: info_hash,
				pieces_length: torrent_pieces_length				
			},
			stats: {
				seeders: 0, 
				leechers: 0, 
				downloads: 0
			}, 
			ips: {
				list:[],
				count:0
			},
			announce: {
				list: announce_list,
				count: announce_count						
			},
			scrape: []
	};
	
	if(announce_count)
		runClient(info_hash);
	else
		runDHTLookup(info_hash);
});

/*
 * GET REQUEST: /stats?access_key=
 * access_key = (string)
 * 
 */

router.get('/stats', function(req, res) {    

	if(access_key != req.query.access_key) {
		res.status(404).send();
		return;
	}
		
	var active = Object.keys(session).length;
	var pending = 0;
	
	try {
		for(var key in session) {
			if(session[key].added > Date.now()-300) {
				pending++;
			}
		}
	} 
	catch(err) {}	
	
	res.send('{"dht":'+stats.dht+',"tracker":'+stats.tracker+',"active":'+active+',"pending":'+pending+',"last_access":'+stats.last_access+',"uptime":'+countUpFromTime(stats.started)+'}');
});

/* TODO: DHT */

var dht = new DHT();

dht.listen(bt_port, function() {
	log('DHT listening on port', bt_port);
});

dht.on('peer', function(peer, infoHash) {
	log('DHT found peer', peer);
	
	if(peer.port < 1000)
		return;
	
	var info_hash = parseInfoHash(infoHash);
		
	// filter unique ip
	if(!checkByValue(session[info_hash].ips.list, peer.host)) {
		// set ip to ready
		session[info_hash].ips.list.push(peer.host);
		session[info_hash].ips.count++;
	}
	else
	{
		return;
	}	

	connectToPeer(peer, infoHash);	
});


function connectToPeer(peer, infoHash) {
	log('DHT connect to peer', peer);
	
	var info_hash = parseInfoHash(infoHash);
	
	const socket = new net.Socket();
    socket.setTimeout(dht_timeout);
    
    socket.on('close', function() { 
    	log('DHT socket close', peer.host+':'+peer.port);
    	checkEndDHT(info_hash);
    });    
    
    socket.on('timeout', function() { 
    	log('DHT socket timeout', peer.host+':'+peer.port);
    	socket.end();
    	socket.destroy();    	
    });      
    
    socket.on('error', function(err) {
    	log('DHT socket error', err);
    	socket.end();
    	socket.destroy();
    });     
    
    socket.connect(peer.port, peer.host, function() {
    
    	const wire = new Protocol();
    	socket.pipe(wire).pipe(socket);
    	
    	wire.handshake(infoHash, session[info_hash].peer_id, {dht: true});     
   
    	wire.on('bitfield', function(bitfield) {
    		log('DHT bitfield', peer.host+':'+peer.port);
    	    		
    	    // Bits set in the bitfield.
    		var setBits = 0;
    	      
    	    // Maximum number of bits available to be set with the current field size.
    		var maxBits = bitfield.buffer.length << 3;
    	      
    	    // The maximum number of bits which constitutes the whole torrent.
    	    var fullBits = session[info_hash].torrent.pieces_length;
    	      
    	    for(i=0; i <= maxBits; i++) {
    	    	if(bitfield.get(i)) 
    	    		setBits++;
    	    }
    	      
    	    var state = fullBits === setBits ? "SEEDER" : "LEECHER";
    	    		
    	    if(state == 'SEEDER')
    	    	session[info_hash].stats.seeders++;
    	    else
    	    	session[info_hash].stats.leechers++;
    	    
            socket.end();
            socket.destroy();
    	})
    });  	    
}
	
/* TODO: CLIENT */

function runClient(infoHash) {
	log('Tracker client started', infoHash);
	
	stats.tracker++;
	
	var clientOpts = {
		infoHash: infoHash,
		peerId: session[infoHash].peer_id,
		announce: session[infoHash].announce.list,
		port: bt_port,
		timeout: tracker_timeout
	};

	var client = new Client(clientOpts);
	
	session[infoHash].client = client;
	
	client.on('error', function(err) {
		log('Tracker client error', err);
		checkEndAnnounce(infoHash);
	});

	client.on('warning', function(err) {
		log('Tracker client warning', err);
		checkEndAnnounce(infoHash);
	});	
	
	/*
	//start getting peers from the tracker
	client.start();
	client.on('update', function(data) {
		log('Tracker client update', data);
	});
	*/	
	
	client.scrape();
	client.on('scrape', function(data) {
		log('Tracker client scrape', data);
				
		session[infoHash].scrape.push({
			seeders: data.complete,
			leechers: data.incomplete,
			downloads: data.downloaded
		});
		
		checkEndAnnounce(infoHash);
	});
}

/* TODO: FUNCTIONS */

function runDHTLookup(infoHash) {
	log('DHT lookup started', infoHash);
	
	stats.dht++;
	
	dht.lookup(infoHash, function() {
		log('DHT lookup finish', infoHash);
		session[infoHash].lookup = false;
		checkEndDHT(infoHash, true);
	});		
}

function checkEndAnnounce(infoHash) {
	
	session[infoHash].announce.count--;
	
	log('Check end Announce count', session[infoHash].announce.count);
	
	if(session[infoHash].announce.count == 0) {

		// destroy client
    	session[infoHash].client.destroy();
		
		var scrape = uniqueObjectArray(session[infoHash].scrape);
		
		for(var key in scrape) {			
			
			var stats = scrape[key];
			
			if(isNumeric(stats.seeders))
				session[infoHash].stats.seeders += stats.seeders;
			
			if(isNumeric(stats.leechers))
				session[infoHash].stats.leechers += stats.leechers;
			
			if(isNumeric(stats.downloads))
				session[infoHash].stats.downloads += stats.downloads;
		}	

		// run DHT
		if(!Object.keys(scrape).length || session[infoHash].stats.seeders < 1) {
			runDHTLookup(infoHash);			
			return;
		}
		
    	session[infoHash].app.send('{"seeders":'+session[infoHash].stats.seeders+',"leechers":'+session[infoHash].stats.leechers+',"downloads":'+session[infoHash].stats.downloads+'}');
    	delete session[infoHash];
    	
    	log('Session deleted by Tracker', infoHash);
	}
}

function checkEndDHT(infoHash, lookup) {

	if(!lookup)
		session[infoHash].ips.count--;
		
	log('Check end DHT count', session[infoHash].ips.count);
	
	
	if(!session[infoHash].lookup && session[infoHash].ips.count == 0) {
    	session[infoHash].app.send('{"seeders":'+session[infoHash].stats.seeders+',"leechers":'+session[infoHash].stats.leechers+',"downloads":-1}');
    	delete session[infoHash];
    	
    	log('Session deleted by DHT', infoHash);
	}	
}

function parseInfoHash(infoHash) {
	return infoHash.toString('hex').toUpperCase();
}

function checkByKey(arr, key) {
	return typeof arr[key] !== 'undefined' ? true : false;
}

function checkByValue(arr, value) {
	var result = arr.filter(function(obj) {
		return obj == value; 
	});
	return result.length ? true : false;
}
	
function uniqueObjectArray(obj) {
	return obj.filter((elem, index, self) => self.findIndex(
			(t) => {return (t.seeders === elem.seeders && t.leechers === elem.leechers && t.downloads === elem.downloads)}) === index);
}

function isNumeric(n) {
	return (typeof n == "number" && !isNaN(n));
}

function countUpFromTime(countFrom) {
	  
	countFrom = new Date(countFrom).getTime();
	var now = new Date(),
		countFrom = new Date(countFrom),
	    timeDifference = (now - countFrom);
	    
	var secondsInADay = 60 * 60 * 1000 * 24,
		secondsInAHour = 60 * 60 * 1000;
	    
	d = Math.floor(timeDifference / (secondsInADay) * 1);
	h = Math.floor((timeDifference % (secondsInADay)) / (secondsInAHour) * 1);
	m = Math.floor(((timeDifference % (secondsInADay)) % (secondsInAHour)) / (60 * 1000) * 1);
	s = Math.floor((((timeDifference % (secondsInADay)) % (secondsInAHour)) % (60 * 1000)) / 1000 * 1);

	return +d+': days, '+h+': hours, '+m+': minutes, '+s+': seconds';
}

function log(title, text) {
	console.log(title+':', text);
}
