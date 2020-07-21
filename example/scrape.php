<?php
require_once("benc/BDecode.php");
require_once("benc/BEncode.php");

# http://localhost:8585/scrape?access_key=qwerty&info_hash=&pieces_length=

$scrape_url = "http://localhost";
$scrape_port = 8585;
$access_key = "qwerty";
$torrent_file = "test.torrent";
$announce_list = array("udp://tracker.leechers-paradise.org:6969/announce",
					   "udp://explodie.org:6969/announce",
					   "udp://exodus.desync.com:6969/announce",
					   "udp://tracker.cyberia.is:6969/announce");	

$torrent = file_get_contents($torrent_file);
if(!$torrent)
	die("torrent file not found");
	
$array = BDecode($torrent, strlen($torrent));
$info_hash = strtoupper(sha1(BEncode($array["info"])));
$pieces_length = strlen($array["info"]["pieces"]) / 20;

if(!$array || !$info_hash || !$pieces_length)
	die("can't bencoding torrent file");

$request = $scrape_url.":".$scrape_port."/scrape?access_key=".$access_key."&info_hash=".$info_hash."&pieces_length=".$pieces_length;

if($announce_list)
	$request .= "&announce_list=".implode(",", $announce_list);
	
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $request);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

echo $result;

?>