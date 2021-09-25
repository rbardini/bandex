<?php
	$cookie = "./rucard.cookie";
	$postdata = "codpes=" . $_REQUEST["nusp"] . "&senusu=" . $_REQUEST["senha"] . "&Submit=+Entrar+";
	
	$ch = curl_init();
	curl_setopt ($ch, CURLOPT_URL, "https://uspdigital.usp.br/rucard/autenticar");
	curl_setopt ($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt ($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);
	curl_setopt ($ch, CURLOPT_TIMEOUT, 60);
	curl_setopt ($ch, CURLOPT_FOLLOWLOCATION, false);
	curl_setopt ($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt ($ch, CURLOPT_COOKIESESSION, true);
	curl_setopt ($ch, CURLOPT_COOKIEJAR, $cookie);
	curl_setopt ($ch, CURLOPT_COOKIEFILE, $cookie);
	curl_setopt ($ch, CURLOPT_POSTFIELDS, $postdata);
	curl_setopt ($ch, CURLOPT_POST, true);
	curl_exec ($ch);
	
	curl_setopt($ch, CURLOPT_URL, "https://uspdigital.usp.br/rucard/extratoListar");
	$result = curl_exec ($ch);
	
	@curl_close($ch);
	@unlink($cookie);
	
	$doc=new DOMDocument();
	@$doc->loadHTML($result);
	$xml=simplexml_import_dom($doc);
	$balance=$xml->xpath('//table[@class="table_list"][1]/tr[last()]/td[last()]');
	
	echo $balance ? $balance[0] : -1;
	
	exit;
?>
