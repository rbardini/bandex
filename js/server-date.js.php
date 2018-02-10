<?php
	header("Content-Type: application/javascript");
	header("Expires: 0");
	header("Cache-Control: no-cache, no-store, must-revalidate");
	header("Pragma: no-cache");
?>
var serverDate = new Date(<?php echo date("Y, n-1, j, G") ?>);
