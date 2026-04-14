#!/bin/bash

#make firefox
mkdir firefox_build
cp -rf common/* firefox_build
cp -rf firefox/* firefox_build
cd firefox_build
if [[ $1 != "debug" ]]; then
    sed -i 's/-debug-/-/g' manifest.json
fi
rm ../anesidora_$1_firefox.xpi
jar -cMf ../anesidora_$1_firefox.xpi *
cd ..
rm -rf firefox_build

#make chrome
mkdir chrome_build
cp -rf common/* chrome_build
cp -rf chrome/* chrome_build
cd chrome_build
if [[ $1 != "debug" ]]; then
    sed -i 's/-debug-/-/g' manifest.json
fi
rm ../anesidora_$1_chrome.zip
jar -cMf ../anesidora_$1_chrome.zip *
cd ..
rm -rf chrome_build


