<?php

# http://localhost:8585/stats?access_key=qwerty

$scrape_url = "http://localhost";
$scrape_port = 8585;
$access_key = "qwerty";

$request = $scrape_url.":".$scrape_port."/stats?access_key=".$access_key;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $request);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

echo $result;

?>