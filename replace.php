<?php

$search = [
  "require('textUtil",
  "require('i18n",
  "require('log",
  "require('localStorage",
  "require('nodeExample",
  "require('serverPug",
  "require('momentWithLocale"
];

$replace = [
 "require('@jsengine/text-utils",
 "require('@jsengine/i18n",
 "require('@jsengine/log",
 "require('@jsengine/local-storage",
 "require('@jsengine/node-example",
 "require('@jsengine/server-pug",
 "require('@jsengine/moment-with-locale"
];


$directory = new RecursiveDirectoryIterator('.');
$iterator = new RecursiveIteratorIterator($directory);
$files = new RegexIterator($iterator, '/^.+\.js/i', RecursiveRegexIterator::GET_MATCH);

foreach($files as $file => $obj) {
  if (strstr($file, '/node_modules/')) continue;

  echo "$file\n";

  $content = file_get_contents($file);

echo $content, "\n";

  $replaced = str_replace($search, $replace, $content);

echo $replaced, "\n";
  file_put_contents($file, $replaced);
}
