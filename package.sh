#!/bin/sh
#download latest jquery
mkdir -p common/js/jquery
curl http://code.jquery.com/jquery-3.3.1.min.js > common/js/jquery/jquery-3.3.1.min.js 2>/dev/null
curl http://code.jquery.com/ui/1.12.1/jquery-ui.min.js > common/js/jquery/jquery-ui.min.js 2>/dev/null

#make firefox
mkdir firefox_build
cp -rf common/* firefox_build
cp -rf firefox/* firefox_build
cd firefox_build
rm ../anesidora_firefox.xpi
jar -cMf ../anesidora_firefox.xpi *
cd ..
rm -rf firefox_build

#make chrome
mkdir chrome_build
cp -rf common/* chrome_build
cp -rf chrome/* chrome_build
cd chrome_build
rm ../anesidora_chrome.zip
jar -cMf ../anesidora_chrome.zip *
cd ..
rm -rf chrome_build
