#!/bin/bash
#make firefox
function make_extension {
    # $1 == platform
    # $2 == extension
    # $3 == debug
    # $4 == keep files

    PLATFORM=$1
    EXTENSION=$2

    if [[ $3 == "debug" ]]; then
        DEBUG=1
    else
        DEBUG=0
    fi

    if [[ $4 == "keep" ]]; then
        KEEP=1
    else
        KEEP=0
    fi

    mkdir -p ${PLATFORM}_build
    cp -rf common/* ${PLATFORM}_build
    cp -rf ${PLATFORM}/* ${PLATFORM}_build
    cd ${PLATFORM}_build
    NAME=../anesidora_debug_${PLATFORM}.xpi
    if [[ $DEBUG -eq 0 ]]; then
        sed -i 's/-debug-/-/g' manifest.json
        NAME=../anesidora_${PLATFORM}.${EXTENSION}
    fi
    rm $NAME
    zip -r $NAME * >/dev/null
    cd ..
    if [[ $KEEP -eq 0 ]]; then
        rm -rf ${PLATFORM}_build
    fi
}

make_extension firefox xpi $1 $2
make_extension chrome zip $1 $2
