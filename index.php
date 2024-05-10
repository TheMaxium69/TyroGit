<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$info = [
    "latest"=>"client-0.1.1",
    "download"=>"http://tyrolium.fr/Download/TyroGit/client-0.1.1.zip"
];

echo json_encode($info);