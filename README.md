**Key features**  
- Scrape peers from tracker announces
- Scrape peers from DHT
- Requests and uptime stats

## How it works

Scrape peers from DHT occurs only if seeders are not found from tracker announces.  
If you only want scrape from DHT, leave announce_list param empty.

## Setup

Edit server.js to change the configuration
```json
accessKey = 'qwerty';
appPort = 8585;
peerPort = 6889;
scrapeTimeout = 10;
```

Run scrape server
```json
node server.js
```
## Requests to scrape server

/scrape?access_key=&info_hash=&announce_list=
```json
{"seeders":103,"leechers":88}
```
/stats?access_key=
```json
{"tracker":59,"dht":12,"active":0,"errors":0,"last_access":"11.10.2021 17:7:10","started":"11.10.2021 16:45:0","uptime":"0 days 0 hours 22 minutes 10 seconds"}
```
