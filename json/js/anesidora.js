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
var stationList=[];
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
    if (stationList.length == 0) {
        getStationList();
    }
}

function getStationList() {
    var request = "{'userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    sendRequest(false, true,"user.getStationList", request, handleGetStationList);
}
function handleGetStationList(response, status, xhr) {
    stationList = response.result.stations;
}
function getPlaylist(stationToken) {
    sessionStorage.currentStation = stationToken;
    var request = "{'stationToken':'" + stationToken + "','additionalAudioUrl':'HTTP_192_MP3','userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    sendRequest(true,true,"station.getPlaylist",request,handleGetPlaylist);
}
function handleGetPlaylist(response, status, xhr) {
    currentPlaylist = response.result.items;
    currentPlaylist.pop(); //Pop goes the advertisment.
}
function addFeedback(songNum, rating) {
    if (currentSong.songRating == true&& rating == true) {  // Bug fix for addFeedback being executed by bind()
        return;
    }
    if (songNum == -1) {
        var request = "{'trackToken':'" + currentSong.trackToken + "','isPositive':" + rating + ",'userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
        currentSong.songRating = rating;
        if (rating == false) {
            currentSong.disliked = true;
        }
    }
    else {
        var request = "{'trackToken':'" + prevSongs[songNum].trackToken + "','isPositive':" + rating + ",'userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
        prevSongs[songNum].songRating = rating;
        if (rating == false) {
            prevSongs[songNum].disliked = rating;
        }
    }
    sendRequest(false, true, "station.addFeedback", request, handleAddFeedback);
}
function handleAddFeedback(response, status, xhr) {

}
function shareSong() {
    $.ajax({
        url: "https://graph.facebook.com/" + localStorage.facebookUsername + "/feed?access_token=" +
            localStorage.accessToken +
            "&message=I'm listening to " + currentSong.songName + " by " + currentSong.artistName +
            "&picture=" + currentSong.albumArtUrl +
            "&link=" + encodeURI(currentSong.songExplorerUrl) +
            "&name=" + currentSong.songName +
            "&caption=by " + currentSong.artistName + " on " + currentSong.albumName,
        type: "POST",
        statusCode: { 400: function () { $('#fbCanDie').attr('src', "https://www.facebook.com/dialog/oauth?client_id=124332377700986&response_type=token&scope=publish_stream&redirect_uri=https://www.facebook.com/connect/login_success.html"); shareSong(); } }
    });
}
function sleepSong() {
    var request = "{'trackToken':'" + currentSong.trackToken + "','userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    sendRequest(false, true, "user.sleepSong", request, handleSleepSong);
}
function handleSleepSong(response, info) {

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
function explainTrack() {
    var request = "{'trackToken':'" + currentSong.trackToken + "','userAuthToken':'" + userAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    sendRequest(false, true, "track.explainTrack", request, handleExplainTrack);
}
function handleExplainTrack(response, status, xhr) {
    console.log(response);
}

function sendRequest(secure, encrypted, method, request, handler) {
    var failed = false;
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
        success: function (response, status, xhr) {
            if (response.stat == "fail") {
                switch (response.code) {
                    case 0:
                        return;
                    case 1001:
                        partnerLogin();
                        break;
                    default:
                        console.log(response);

                }
                if (method == "station.getPlaylist" && failed == false) {
                    getPlaylist(sessionStorage.currentStation);
                    failed = true;
                }

            }
            else {
                handler(response, status, xhr);
            }
        }

    });
}
//Defunct for the time being.
//function handleError(faultString) {
//    //console.log(faultString.split("|")[3]);
//    if (faultString.split("|")[2] == "AUTH_INVALID_TOKEN") {
//        auth();
//    }
//}