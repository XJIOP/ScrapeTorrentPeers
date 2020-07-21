# ScrapeTorrentPeers
Scrape torrents peers from tracker announces and DHT.

**Key features**  
- Scrape peers from tracker announces
- Scrape peers from DHT
- Uptime stats

## How to use

Scrape peers from DHT occurs only if peers are not found from tracker announces.  
If you only want scrape from DHT, leave announce_list param empty.

**Request URLs**  
/scrape?access_key=&info_hash=&pieces_length=&announce_list=
```json
{"seeders":103,"leechers":88,"downloads":91}
```
/stats?access_key=
```json
{"dht":3328,"tracker":16105,"active":0,"pending":0,"last_access":"7/21/2020, 2:23:38 PM","uptime":"7: days, 18: hours, 25: minutes, 38: seconds"}
```
