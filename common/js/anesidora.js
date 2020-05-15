/*globals $, encrypt, decrypt, currentSong, play, prevSongs*/
/*exported addFeedback, explainTrack, search, createStation, sleepSong, setQuickMix, deleteStation */

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
    "use strict";
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
    let params = []
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
    "use strict";
    var time = (new Date()).getTime();
    var now = parseInt(String(time).substr(0, 10));
    return parseInt(syncTime) + (now - clientStartTime);
}

async function sendRequest(secure, encrypted, method, request, handler) {
    "use strict";
    var failed = false;
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
        }
        parameters = "&{0}".format(formatParameters(parameterObject))
        // parameters = "&auth_token={0}&partner_id={1}&user_id={2}".format(encodeURIComponent(userAuthToken), partnerId, userId);
    } else {
        parameters = "";
    }
    let new_request = encrypted ? encrypt(request) : request;
    $.ajax({
        async: false,
        type: "POST",
        url: url + method + parameters,
        contentType: "text/plain",
        data: new_request,
        dataType: "json",
        success: function (response, status, xhr) {
            if (response.stat === "fail") {
                switch (response.code) {
                case 0:
                    return;
                case 1001:
                    partnerLogin();
                    break;
                default:
                	console.log('sendRequest failed: ',parameters, request, response);
                }
                if (method == "station.getPlaylist" && failed == false) {
                    getPlaylist(sessionStorage.currentStation);
                    failed = true;
                }
            } else {
                handler(response, status, xhr);
            }
        }
    });
}

function handleGetStationList(response) {
    "use strict";
    stationList = response.result.stations;
    if (localStorage.userStation === undefined) {
        response.result.stations.forEach(function (station) {
            if (station.isQuickMix) {
                localStorage.userStation = station.stationId;
            }
        });
    }
}

function getStationList() {
    "use strict";
    let request = JSON.stringify({
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    sendRequest(false, true,"user.getStationList", request, handleGetStationList);
}

//Set this up to store good user login information. Need to probe the JSON method and see how it responds with bad
//login info so we can know that un/pw is bad before assuming it is.
//seems error 1002 is bad login info.
function handleUserLogin(response) {
    "use strict";
    userAuthToken = response.result.userAuthToken;
    userId = response.result.userId;
    if (stationList.length == 0) {
        getStationList();
    }
}

function userLogin(response) {
    "use strict";
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
    }
    let parameters = "auth.userLogin&{0}".format(formatParameters(parameterObject));

    // var parameters = "auth.userLogin&auth_token={0}&partner_id={1}".format(encodeURIComponent(response.result.partnerAuthToken), response.result.partnerId);
    sendRequest(true, true, parameters, request, handleUserLogin);
}

function handlePartnerLogin(response) {
    "use strict";
    var b = stringToBytes(decrypt(response.result.syncTime));
    // skip 4 bytes of garbage
    var s = "", i;
    for (i = 4; i < b.length; i++) {
        s += String.fromCharCode(b[i]);
    }
    syncTime = parseInt(s);
    clientStartTime = parseInt((new Date().getTime() + "").substr(0, 10));
    userLogin(response);
}

function partnerLogin() {
    "use strict";
    if (localStorage.username !== "" && localStorage.password !== "") {
        let request = JSON.stringify({
            "username": "android",
            "password": "AC7IBG09A3DTSYM4R41UJWL07VLN8JI7",
            "version": "5",
            "deviceModel": "android-generic",
            "includeUrls": true
        });
        sendRequest(true, false, "auth.partnerLogin", request, handlePartnerLogin);
    }
}

//removes ads from fetched playlist. solves issue when player gets stuck on "undefined - undefined" [added by BukeMan]
function removeAds(playList) {
    "use strict";
    playList.forEach(function (value, index) {
        if (value.hasOwnProperty("adToken")) {
            playList.splice(index, 1);
        }
    });
}

function handleGetPlaylist(response) {
    "use strict";
    currentPlaylist = response.result.items;
    //currentPlaylist.pop(); //Pop goes the advertisment.
    removeAds(currentPlaylist);
}

function getPlaylist(stationToken) {
    "use strict";
    sessionStorage.currentStation = stationToken;
    let audioFormats = [
        "HTTP_128_MP3",
        "HTTP_64_AACPLUS_ADTS"
    ]

    let request = JSON.stringify({
        "stationToken": stationToken,
        "additionalAudioUrl": audioFormats.join(","),
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    sendRequest(true, true, "station.getPlaylist", request, handleGetPlaylist);
}

function addFeedback(songNum, rating) {
    "use strict";
    if (currentSong.songRating && rating) {  // Bug fix for addFeedback being executed by bind()
        return;
    }
    if (!songNum || isNaN(songNum)) { // just in case
    	return;
    }
    
    let song;
    if (songNum === -1) {
        song = currentSong;
    } else {
        song = prevSongs[songNum];
    }
    if (rating == song.songRating) {
    	return;
    }
    if (rating === true || rating === false) {
    
    } else if (rating < 0) {
    	rating = false;
    } else if (rating == 0) {
    	return;
    } else if (rating > 0) {
    	rating = true;
    }

    let request = JSON.stringify({
        "trackToken": song.trackToken,
        "isPositive": rating,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    song.songRating = rating;
    if (rating === false) {
        song.disliked = true;
    }
    sendRequest(false, true, "station.addFeedback", request, function () { return undefined; });
}

function sleepSong() {
    "use strict";
    let request = JSON.stringify({
        "trackToken": currentSong.trackToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    sendRequest(false, true, "user.sleepSong", request, function () { return undefined; });
}

function setQuickMix(mixStations) {
    "use strict";
    // TODO: Test this XXX
    // var mixStations_str = mixStations.toString().replace(/,/g, "','");

    let request = JSON.stringify({
        "quickMixStationIds": mixStations,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    sendRequest(false,true,"user.setQuickMix",request, function () { return undefined; });
}

function handleSearch(response) {
    "use strict";
    console.log(response);
}

function search(searchString) {
    "use strict";
    //searchString = searchString.replace("&", "&amp").replace("'", "&apos").replace("\"", "&quot").replace("<", "&lt").replace(">", "&gt");

    let request = JSON.stringify({
        "searchText": searchString,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });

    sendRequest(false, true, "music.search", request, handleSearch);
}

function handleCreateStation(response) {
    "use strict";
    play(response.result.stationId);
}

function createStation(musicToken) {
    "use strict";
    let request = JSON.stringify({
        "musicToken": musicToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    sendRequest(false, true, "station.createStation", request, handleCreateStation);
}

function deleteStation(stationToken) {
    "use strict";
    let request = JSON.stringify({
        "stationToken": stationToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    sendRequest(false, true, "station.deleteStation", request, function () { return undefined; });
}

function explainTrack() {
    "use strict";
    let request = JSON.stringify({
        "trackToken": currentSong.trackToken,
        "userAuthToken": userAuthToken,
        "syncTime": getSyncTime(syncTime)
    });
    sendRequest(false, true, "track.explainTrack", request, function () { return undefined; });
}
