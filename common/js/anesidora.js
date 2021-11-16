"use strict";
/*globals is_android stationImgs, encrypt, decrypt, currentSong, play, prevSongs, comingSong*/
/*exported addFeedback, addFeedbackFromToken explainTrack, search, createStation, sleepSong, setQuickMix, deleteStation */

let dontRetryPartnerLogin = false;

//https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format#4673436
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return args[number] !== undefined
                ? args[number]
                : match;
        });
    };
}

// http://stackoverflow.com/questions/1240408/reading-bytes-from-a-javascript-string
function stringToBytes(str) {
    var ch, st, re = [];
    for(var i = 0; i < str.length; i ++) {
        ch = str.charCodeAt(i);  // get char
        st = [];                 // set up "stack"
        do {
            st.push(ch & 0xFF);  // push byte to stack
            ch = ch >> 8;          // shift value down by 1 byte
        }
        while (ch);
        // add stack contents to result
        // done because chars have "wrong" endianness
        re = re.concat(st.reverse());
    }
    // return an array of bytes
    return re;
}

function formatParameters(parameterObject) {
    let params = [];
    for(let key in parameterObject) {
        let value = parameterObject[key];
        if (value.length > 0) {
            params.push("{0}={1}".format(key, value));
        } else {
            params.push(key);
        }
    }
    return params.join("&");
}

var clientStartTime = 0;
var syncTime = 0;
var userAuthToken = "";
var userId = "";
var partnerId;
var stationList=[];
var currentPlaylist;

function getSyncTime(syncTime) {
    var time = (new Date()).getTime();
    var now = parseInt(String(time).substr(0, 10));
    return parseInt(syncTime) + (now - clientStartTime);
}

var failed = false;
async function sendRequest(secure, encrypted, method, request) {
    var url, parameters;
    if (localStorage.forceSecure === "true" || secure) {
        url = "https://tuner.pandora.com/services/json/?method=";
    } else {
        url = "http://tuner.pandora.com/services/json/?method=";
    }
    if (userAuthToken !== "") {
        let parameterObject = {
            "auth_token": encodeURIComponent(userAuthToken),
            "partner_id": partnerId,
            "user_id": userId
        };
        parameters = "&{0}".format(formatParameters(parameterObject));
        // parameters = "&auth_token={0}&partner_id={1}&user_id={2}".format(encodeURIComponent(userAuthToken), partnerId, userId);
    } else {
        parameters = "";
    }
    let new_request = encrypted ? encrypt(request) : request;
    let response = await fetch(url + method + parameters, {
        method: "POST",
        headers: {
            "Content-Type": encrypted ? "text/plain" : "application/json"
        },
        body: new_request
    });
    response = await response.json();
    if (response.stat === "fail") {
        switch (response.code) {
        case 0:
            return;
        case 1001:
            if (!dontRetryPartnerLogin) {
                partnerLogin();
                dontRetryPartnerLogin = true;
            }
            break;
        default:
            console.log("sendRequest failed: ",parameters, request, response);
        }
        if (method == "station.getPlaylist" && failed == false) {
            getPlaylist(sessionStorage.currentStation);
            failed = true;
        }
    }
    return response;
}


async function getStationList() {
    let request = JSON.stringify({
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime),
        includeStationArtUrl: true
    });
    let response = await sendRequest(false, true,"user.getStationList", request);
    stationList = response.result.stations;
    stationList.forEach(e => {
        stationImgs[e.stationToken] = e.artUrl;
    });
    localStorage.stationImgs = JSON.stringify(stationImgs);

    if (localStorage.userStation === undefined) {
        response.result.stations.forEach(function (station) {
            if (station.isQuickMix) {
                localStorage.userStation = station.stationId;
            }
        });
    }
    return stationList;
}

//Set this up to store good user login information. Need to probe the JSON method and see how it responds with bad
//login info so we can know that un/pw is bad before assuming it is.
//seems error 1002 is bad login info.

async function userLogin(response) {
    partnerId = response.result.partnerId;
    if (localStorage.username === undefined || localStorage.password === undefined) {
        return;
    }

    let request = JSON.stringify({
        "loginType": "user",
        "username": localStorage.username,
        "password": localStorage.password,
        "partnerAuthToken": response.result.partnerAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    let parameterObject = {
        "auth_token": encodeURIComponent(response.result.partnerAuthToken),
        "partner_id": response.result.partnerId
    };
    let parameters = "auth.userLogin&{0}".format(formatParameters(parameterObject));

    // var parameters = "auth.userLogin&auth_token={0}&partner_id={1}".format(encodeURIComponent(response.result.partnerAuthToken), response.result.partnerId);
    let res = await sendRequest(true, true, parameters, request);
    if (res.stat == "fail") {
        return "uncool credentials";
    }
    
    dontRetryPartnerLogin = false;

    userAuthToken = res.result.userAuthToken;
    userId = res.result.userId;
    if (stationList.length == 0) {
        await getStationList();
    }
}


async function partnerLogin() {
    if (localStorage.username !== "" && localStorage.password !== "") {
        let request = JSON.stringify({
            "username": "android",
            "password": "AC7IBG09A3DTSYM4R41UJWL07VLN8JI7",
            "version": "5",
            "deviceModel": "android-generic",
            "includeUrls": true
        });
        let response = await sendRequest(true, false, "auth.partnerLogin", request);
        var b = stringToBytes(decrypt(response.result.syncTime));
        // skip 4 bytes of garbage
        var s = "", i;
        for (i = 4; i < b.length; i++) {
            s += String.fromCharCode(b[i]);
        }
        syncTime = parseInt(s);
        clientStartTime = parseInt((new Date().getTime() + "").substr(0, 10));
        return await userLogin(response);
    }
}

//removes ads from fetched playlist. solves issue when player gets stuck on "undefined - undefined" [added by BukeMan]
function removeAds(playList) {
    playList.forEach(function (value, index) {
        if (Object.hasOwnProperty.call(value, "adToken")) {
            playList.splice(index, 1);
        }
    });
}

async function getPlaylist(stationToken) {
    sessionStorage.currentStation = stationToken;
    let audioFormats = [
        "HTTP_128_MP3",
        "HTTP_64_AACPLUS_ADTS"
    ];
    if (is_android()) {
        audioFormats = [
            "HTTP_128_MP3"
        ];
    }

    let request = JSON.stringify({
        "stationToken": stationToken,
        "additionalAudioUrl": audioFormats.join(","),
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    let response = await sendRequest(true, true, "station.getPlaylist", request);
    if (!response.result) {
        failed = true;
        return;
    } else {
        failed = false;
    }
    currentPlaylist = response.result.items;
    //currentPlaylist.pop(); //Pop goes the advertisment.
    removeAds(currentPlaylist);
}

/**
 * @param {string} token 
 * @param {boolean} liked 
 */
async function addFeedbackFromToken(token, liked) {
    const song = [...prevSongs, currentSong, comingSong, ...currentPlaylist]
        .filter(e => !!e)
        .find(e => e.trackToken === token);

    if (!song) {
        throw new Error("Couldn't find song for token " + token);
    }

    if (song.songRating === (liked?1:-1)) {
        return; // no action needed
    }

    let request = JSON.stringify({
        "trackToken": song.trackToken,
        "isPositive": liked,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    song.songRating = (liked?1:-1);
    await sendRequest(false, true, "station.addFeedback", request);
}

async function addFeedback(songNum, liked) {
    if (currentSong.songRating === true && liked) {  // Fixes for addFeedback being executed by bind()
        return; // edit by hucario, 5/22/2021: i have no idea why this is here but I don't want to reintroduce a bug
    }
    
    let song;
    if (songNum === -1) {
        song = currentSong;
    } else {
        song = prevSongs[songNum];
    }

    if (!songNum || typeof liked !== "boolean") {
        throw new Error("incorrect arguments passed to addFeedback");
    }
    if (!song) {
        throw new Error("out of range or something");
    }

    if (song.songRating === (liked?1:-1)) {
        return; // no action needed
    }

    let request = JSON.stringify({
        "trackToken": song.trackToken,
        "isPositive": liked,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    song.songRating = (liked?1:-1);
    await sendRequest(false, true, "station.addFeedback", request);
}

async function sleepSong() {
    let request = JSON.stringify({
        "trackToken": currentSong.trackToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    await sendRequest(false, true, "user.sleepSong", request);
}

async function setQuickMix(mixStations) {
    let request = JSON.stringify({
        "quickMixStationIds": mixStations,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    await sendRequest(false,true,"user.setQuickMix", request);
}

async function search(searchString) {
    let request = JSON.stringify({
        "searchText": searchString,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });

    return await sendRequest(false, true, "music.search", request);
}


async function createStation(musicToken) {
    let request = JSON.stringify({
        "musicToken": musicToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    let response = await sendRequest(false, true, "station.createStation", request);
    
    await play(response.result.stationId);
}

async function deleteStation(stationToken) {
    let request = JSON.stringify({
        "stationToken": stationToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    await sendRequest(false, true, "station.deleteStation", request);
}

async function explainTrack() {
    let request = JSON.stringify({
        "trackToken": currentSong.trackToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    return await sendRequest(false, true, "track.explainTrack", request);
}

if (localStorage.username !== "" && localStorage.password !== "") {
    partnerLogin();
}