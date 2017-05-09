#!/bin/sh
cd json
cp manifest.json.firefox manifest.json
jar -cMf ../anesidora.xpi *
cp manifest.json.chrome manifest.json
jar -cMf ../anesidora.zip *

