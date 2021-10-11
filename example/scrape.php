<?php
require_once("benc/BDecode.php");
require_once("benc/BEncode.php");

# http://localhost:8585/scrape?access_key=&info_hash=

$app_url = "http://localhost";
$app_port = 8585;
$access_key = "qwerty";

$torrent_file = "test.torrent";
$announce_list = array("http://bttracker.debian.org:6969/announce");	

$torrent = file_get_contents($torrent_file);
if(!$torrent)
	die("torrent file not found");
	
$array = BDecode($torrent, strlen($torrent));
$info_hash = strtoupper(sha1(BEncode($array["info"])));

if(!$array || !$info_hash)
	die("can't bencoding torrent file");

$request = "$app_url:$app_port/scrape?access_key=$access_key&info_hash=$info_hash";

if($announce_list)
	$request .= "&announce_list=".json_encode(array_values((array) $announce_list));
	
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $request);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

echo $result;

?>