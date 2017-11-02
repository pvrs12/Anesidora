#!/bin/sh
#cp ../manifest.json.firefox manifest.json
mkdir firefox_build
cp -rf common/* firefox_build
cp -rf firefox/* firefox_build
cd firefox_build
jar -cMf ../anesidora_firefox.xpi *
cd ..
rm -rf firefox_build

mkdir chrome_build
cp -rf common/* chrome_build
cp -rf firefox/* chrome_build
cd chrome_build
jar -cMf ../anesidora_chrome.zip *
cd ..
rm -rf chrome_build