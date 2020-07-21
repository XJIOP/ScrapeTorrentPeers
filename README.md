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
- /scrape?access_key=&info_hash=&pieces_length=&announce_list=
- /stats?access_key=
