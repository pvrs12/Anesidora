String.prototype.format = function () {
    var formatted = this;
    for (arg in arguments) {
        formatted = formatted.replace("{" + arg + "}", arguments[arg]);
    }
    return formatted;
};
// http://stackoverflow.com/questions/1240408/reading-bytes-from-a-javascript-string
function stringToBytes(str) {
    var ch, st, re = [];
    for (var i = 0; i < str.length; i++) {
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
var clientStartTime = 0;
var syncTime = 0;
var userAuthToken = "";
var userId = "";
var partnerId;
var stationList;
var currentPlaylist;
var previousPlaylist;
function getSyncTime(syncTime) {
    return parseInt(syncTime) + (parseInt((new Date().getTime() + '').substr(0, 10)) - clientStartTime);
}
function partnerLogin() {
    if (localStorage.username != "" && localStorage.password != "") {
        var request = "{'username':'android','password':'AC7IBG09A3DTSYM4R41UJWL07VLN8JI7','version':'5','deviceModel':'android-generic','includeUrls':true}";
        sendRequest(true, false, "auth.partnerLogin", request, handlePartnerLogin);
    }
}
function handlePartnerLogin(response, status, xhr) {
    var b = stringToBytes(decrypt(response.result.syncTime));
    // skip 4 bytes of garbage
    var s =""
    for (var i = 4; i < b.length; i++) {
        s += String.fromCharCode(b[i]);
    }
    syncTime = parseInt(s);
    clientStartTime = parseInt((new Date().getTime() + '').substr(0, 10));
    userLogin(response);
}
function userLogin(response) {
    partnerId = response.result.partnerId;
    var request = "{'loginType':'user','username':'" + localStorage.username + "','password':'" + localStorage.password + "','partnerAuthToken':'" + response.result.partnerAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    sendRequest(true, true, "auth.userLogin&auth_token=" + encodeURIComponent(response.result.partnerAuthToken) + "&partner_id=" + response.result.partnerId, request, handleUserLogin);
}
//Set this up to store good user login information. Need to probe the JSON method and see how it responds with bad
//login info so we can know that un/pw is bad before assuming it is.
//seems error 1002 is bad login info.
function handleUserLogin(response, status, xhr) {
    userAuthToken = response.result.userAuthToken;
    userId = response.result.userId;
    getStationList();
}

function getStationList() {
    var request = "{'userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    sendRequest(false, true,"user.getStationList", request, handleGetStationList);
}
function handleGetStationList(response, status, xhr) {
    stationList = response.result.stations;
}
function getPlaylist(stationToken) {
    var request = "{'stationToken':'" + stationToken + "','additionalAudioUrl':'HTTP_192_MP3','userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    sendRequest(true,true,"station.getPlaylist",request,handleGetPlaylist);
}
function handleGetPlaylist(response, status, xhr) {
    if (currentPlaylist = null) {
        previousPlaylist = currentPlaylist;
    }
    currentPlaylist = response.result.items;
}
function addFeedback(rating, songNum) {
    if (curSong.rating == "1" && rating == "1") {  // Bug fix for addFeedback being executed by bind()
        return;
    }
    var data = "<?xml version=\"1.0\"?><methodCall><methodName>station.addFeedback</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "<param><value><string>{3}</string></value></param>";
    data += "<param><value><string>{4}</string></value></param>";
    data += "<param><value>{5}</value></param>";
    data += "<param><value><boolean>{6}</boolean></value></param>";
    data += "<param><value><boolean>0</boolean></value></param>";
    data += "<param><value><int>{7}</int></value></param>";
    data += "</params></methodCall>";
    if (songNum == -1) {
        data = data.format(time(), authToken, curSong.stationId, curSong.musicId, curSong.userSeed, curSong.testStrategy, rating, curSong.songType);
        curSong.rating = rating;
    }
    else {
        data = data.format(time(), authToken, prevSongs[songNum].stationId, prevSongs[songNum].musicId, prevSongs[songNum].userSeed, prevSongs[songNum].testStrategy, rating, prevSongs[songNum].songType);
        prevSongs[songNum].rating = rating;
        if (rating == "0") {
            prevSongs[songNum].disliked = true;
        }
    }
    data = encrypt(data);
    sendRequest(handleFeedback, "station.addFeedback", data, rating);
}
function handleFeedback(response, info) {
    //console.log(info);

}
function addTiredSong() {
    var data = "<?xml version=\"1.0\"?><methodCall><methodName>listener.addTiredSong</methodName><params>"
    data += "<param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "<param><value><string>{3}</string></value></param>";
    data += "<param><value><string>{4}</string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken, curSong.musicId, curSong.userSeed, curSong.stationId);
    data = encrypt(data);
    sendRequest(handleTiredSong, "addTiredSong", data, null);
}
function handleTiredSong(response, info) {

}
function setQuickMix(mixStations) {
    var data = "<?xml version=\"1.0\"?><methodCall><methodName>station.setQuickMix</methodName><params>"
    data += "<param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>RANDOM</string></value></param>";
    data += "<param><value><array><data>";
    for (i = 0; i < mixStations.length; i++) {
        data += "<value><string>" + mixStations[i] + "</string></value>";
    }
    data += "</data></array></value></param>";
    data += "<param><value><string>CUSTOM</string></value></param>";
    data += "<param><value><string></string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken);
    data = encrypt(data);
    sendRequest(handleQuickMix, "setQuickMix", data, null);
}
function handleQuickMix(response, info) {


}
function musicSearch(searchString) {
    searchString = searchString.replace("&", "&amp").replace("'", "&apos").replace("\"", "&quot").replace("<", "&lt").replace(">", "&gt");
    var data = "<?xml version=\"1.0\"?>"
    data += "<methodCall><methodName>music.search</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken, searchString);
    data = encrypt(data);
    sendRequest(handleSearch, "search", data, null);
}
function handleSearch(response, info) {
    var searchSongs = new Array();
    var searchStations = new Array();
    var searchArtists = new Array();
    function searchResult(name, value) {
        this.name = name;
        this.value = value;
    }
    var xpath = response.evaluate("//member[name='songs']//member[name='musicId' or name='artistSummary' or name='songTitle']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (x = 0; x < xpath.snapshotLength; x += 3) {
        searchSongs.push(new searchResult(xpath.snapshotItem(x+2).data + " - " + xpath.snapshotItem(x).data, xpath.snapshotItem(x + 1).data));
    }
    xpath = response.evaluate("//member[name='stations']//member[name='musicId' or name='stationName']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (x = 0; x < xpath.snapshotLength; x += 2) {
        searchStations.push(new searchResult(xpath.snapshotItem(x).data, xpath.snapshotItem(x+1).data));
    }
    xpath = response.evaluate("//member[name='artists']//member[name='artistName' or name='musicId']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (x = 0; x < xpath.snapshotLength; x += 2) {
        searchArtists.push(new searchResult(xpath.snapshotItem(x).data, xpath.snapshotItem(x+1).data));
    }
    searchResults.songs = searchSongs;
    searchResults.stations = searchStations;
    searchResults.artists = searchArtists;
}

function createStation(musicId) {
    var http = new XMLHttpRequest();
    var data = "<?xml version=\"1.0\"?>";
    data += "<methodCall><methodName>station.createStation</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>mi{2}</string></value></param>";
    data += "<param><value><string>{3}</string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken, musicId,"");
    data = encrypt(data);
    sendRequest(handleCreateStation, "createStation", data, null);
}
function handleCreateStation(response, info) {

}
function removeStation(stationId) {
    var http = new XMLHttpRequest();
    var data = "<?xml version=\"1.0\"?>";
    data += "<methodCall><methodName>station.removeStation</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken, stationId);
    data = encrypt(data);
    sendRequest(handleRemoveStation, "removeStation", data, null);
}
function handleRemoveStation(response, info) {

}
function narrative(stationId, musicId) {
    var http = new XMLHttpRequest();
    var data = "<?xml version=\"1.0\"?>";
    data += "<methodCall><methodName>playlist.narrative</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "<param><value><string>{3}</string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken, stationId, musicId);
    data = encrypt(data);
    sendRequest(handleNarrative, "narrative", data, null);
}
function handleNarrative(response, info) {
    curSong.narrative = response.evaluate("//value/text()", response, null, XPathResult.STRING_TYPE, null).stringValue;
}
function bookmarkSong(stationId, musicId) {
    var http = new XMLHttpRequest();
    var data = "<?xml version=\"1.0\"?>";
    data += "<methodCall><methodName>station.createBookmark</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "<param><value><string>{3}</string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken, stationId, musicId);
    data = encrypt(data);
    sendRequest(handleBookmark, "createBookmark", data, null);
}
function bookmarkArtist(musicId) {
    var http = new XMLHttpRequest();
    var data = "<?xml version=\"1.0\"?>";
    data += "<methodCall><methodName>station.createArtistBookmark</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "</params></methodCall>";
    data = data.format(time(), authToken, musicId);
    data = encrypt(data);
    sendRequest(handleBookmark, "createArtistBookmark", data, null);
}
function handleBookmark() {
}
//function sendRequest(method, data, handler) {
//    var URL = "https://tuner.pandora.com/services/json/?method=";
//    var http = new XMLHttpRequest();
//    var timeout = setTimeout(
//                    function () {
//                        http.abort();
//                        location.reload();
//                    },
//                  3000);
//    http.open("POST", URL, false);
//    http.onreadystatechange = function () {
//        if (http.readyState == 4 && http.status == 200) {
//            clearTimeout(timeout);
//            //console.log(http.responseText);
//            handler(http.responseXML, info);
//        }
//    }
//    http.send(data);
//}
//Backup sendrequest which uses jQuery.
function sendRequest(secure, encrypted, method, request, handler) {
    if (secure) {
        var url = "https://tuner.pandora.com/services/json/?method=";
    }
    else {
        var url = "http://tuner.pandora.com/services/json/?method=";
    }
    if (userAuthToken != "") {
        var parameters = "&auth_token=" + encodeURIComponent(userAuthToken) + "&partner_id=" + partnerId + "&user_id=" + userId;
    }
    else {
        var parameters = "";
    }
    if (encrypted) {
        request = encrypt(request);
    }
    $.ajax({
        async: false,
        type: "POST",
        url: url + method + parameters,
        contentType: "text/plain",
        data: request,
        dataType: "json",
        success: handler
    });
}
//Defunct for the time being.
//function handleError(faultString) {
//    //console.log(faultString.split("|")[3]);
//    if (faultString.split("|")[2] == "AUTH_INVALID_TOKEN") {
//        auth();
//    }
//}