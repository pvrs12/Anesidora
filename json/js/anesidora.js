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
function getSyncTime(syncTime) {
    return parseInt(syncTime) + (parseInt((new Date().getTime() + '').substr(0, 10)) - clientStartTime);
}
function time() {
    //console.log('timeOffset: '+timeOffset);
    var n = parseInt((new Date().getTime() + '').substr(0, 10));
    n = n - timeOffset;
    return n+'';
}
function station(name, id) {
    this.name = name;
    this.id = id;
}
function song(artist, title, album, artUrl, artistId, url, stationId, musicId, userSeed, rating, songType, albumUrl, artistUrl, titleUrl) {
    this.art = artUrl;
    this.artist = artist;
    this.album = album;
    this.title = title;
    this.artistId = artistId;
    this.url = url;
    this.stationId = stationId;
    this.musicId = musicId;
    this.userSeed = userSeed;
    this.rating = rating;
    this.songType = songType;
    this.albumUrl = albumUrl;
    this.artistUrl = artistUrl;
    this.titleUrl = titleUrl
    this.testStrategy = "undefined";
    this.disliked = false;
    this.startTime = null;
}
function searchResults(songResults, stationResults, artistsResults) {
    this.songs = songResults;
    this.stations = stationResults;
    this.artists = artistsResults;
}
var searchResults = new searchResults();
var songs = new Array();
var prevSongs = new Array();

function partnerLogin() {
    var request = "{'username':'android','password':'AC7IBG09A3DTSYM4R41UJWL07VLN8JI7','version':'5','deviceModel':'android-generic','includeUrls':true}";
    sendRequest("auth.partnerLogin",request,handlePartnerLogin);
}
function handlePartnerLogin(response, status, xhr) {
    var b = stringToBytes(decrypt(response.result.syncTime));
    // skip 4 bytes of garbage
    var syncTime = "";
    for (var i = 4; i < b.length; i++) {
        syncTime += String.fromCharCode(b[i]);
    }
    clientStartTime = parseInt((new Date().getTime() + '').substr(0, 10));
    userLogin(response, syncTime);
}
function userLogin(response, syncTime) {
    console.log(getSyncTime(syncTime));
    var request = "{'loginType':'user','username':'USERNAME HERE','password':'PASSWORD HERE','partnerAuthToken':'" + response.result.partnerAuthToken + "','syncTime':" + getSyncTime(syncTime) + "}";
    console.log(request);
    console.log(encrypt(request));
    request = encrypt(request);
    sendRequest("auth.userLogin&auth_token=" + encodeURIComponent(response.result.partnerAuthToken) + "&partner_id=" + response.result.partnerId, request, handleUserLogin);
}
function handleUserLogin(response, status, xhr) {
    console.log(response);
 }
function auth(username, password) {
    if (!username || !password) {
        username = localStorage.username;
        password = localStorage.password;
    }
    data = "<?xml version=\"1.0\"?><methodCall><methodName>listener.authenticateListener</methodName><params>";
    data += "<param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "<param><value><string>html5tuner</string></value></param>";
    data += "<param><value><string/></value></param>";
    data += "<param><value><string/></value></param>";
    data += "<param><value><string>HTML5</string></value></param>";
    data += "<param><value><boolean>1</boolean></value></param>";
    data += "</params></methodCall>";
    data = encrypt(data.format(time(), username, password));
    sendRequest(handleAuth, "authenticateListener", data, { "username": username, "password": password });
}
function handleAuth(response, info) {
    authToken = response.evaluate(
            "//member[name='authToken']/value/text()",
            response,
            null,
            XPathResult.STRING_TYPE)
            .stringValue;
    listenerId = response.evaluate(
            "//member[name='listenerId']/value/text()",
            response,
            null,
            XPathResult.STRING_TYPE)
            .stringValue;
    if (response.evaluate("//member[name='listenerState']/value/text()", response, null, XPathResult.STRING_TYPE).stringValue == "SUBSCRIBER") {
        localStorage.PandoraOneUser = "true";
    }
    localStorage.username = info["username"];
    localStorage.password = info["password"];
}
function getStations() {
    var stations = new Array();
    var http = new XMLHttpRequest();
    var data = "<?xml version=\"1.0\"?><methodCall><methodName>station.getStations</methodName><params>";
    data += "<param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param></params></methodCall>";
    data = encrypt(data.format(time(), authToken));
    sendRequest(handleStations, "getStations", data, null);
}
function handleStations(response, info) {
    userStations = new Array();
    var stationNameList = response.evaluate("/methodResponse/params/param/value/array/data/value/struct/member[name='stationName']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var stationIdList = response.evaluate("/methodResponse/params/param/value/array/data/value/struct/member[name='stationId']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    //console.log(stationNameList.snapshotLength);
    for (var i = 0; i < stationNameList.snapshotLength; i++) {
        //console.log(i);
        if (!stationNameList.snapshotItem(i).nodeValue.match("QuickMix")) {
            userStations.push(new station(stationNameList.snapshotItem(i).nodeValue, stationIdList.snapshotItem(i).nodeValue));
        }
        else {
            userStations.unshift(new station("Custom QuickMix", stationIdList.snapshotItem(i).nodeValue));
            localStorage.userStation = stationIdList.snapshotItem(i).nodeValue;
        }
    }
};
function getFragment(stationId) {
    if (stationId != localStorage.lastStation) {
        songs = new Array();
    }
    var data = "<?xml version=\"1.0\"?><methodCall><methodName>playlist.getFragment</methodName>";
    data += "<params><param><value><int>{0}</int></value></param>";
    data += "<param><value><string>{1}</string></value></param>";
    data += "<param><value><string>{2}</string></value></param>";
    data += "<param><value><string>0</string></value></param>";
    data += "<param><value><string></string></value></param>";
    data += "<param><value><string></string></value></param>";
    if (localStorage.PandoraOneUser == "true") {
        data += "<param><value><string>mp3-hifi</string></value></param>";
    }
    else {
        data += "<param><value><string>mp3</string></value></param>";
    }
    data += "<param><value><string>0</string></value></param>";
    data += "<param><value><string>0</string></value></param>";
    data += "</params></methodCall>";
    data = encrypt(data.format(time(), authToken, stationId));
    sendRequest(handleFragment, "getFragment", data, null);
}
function handleFragment(response, info) {
    var artistDetailURL = response.evaluate("//member[name='artistDetailURL']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var artRadio = response.evaluate("//member[name='artRadio']/value", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var songDetailURL = response.evaluate("//member[name='songDetailURL']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var albumDetailURL = response.evaluate("//member[name='albumDetailURL']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var stationId = response.evaluate("//member[name='stationId']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var songTitle = response.evaluate("//member[name='songTitle']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var songType = response.evaluate("//member[name='songType']/value/int/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var userSeed = response.evaluate("//member[name='userSeed']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var albumTitle = response.evaluate("//member[name='albumTitle']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var artistSummary = response.evaluate("//member[name='artistSummary']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var rating = response.evaluate("//member[name='rating']/value/int/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var audioURL = response.evaluate("//member[name='audioURL']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var musicId = response.evaluate("//member[name='musicId']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    var artistId = response.evaluate("//member[name='artistMusicId']/value/text()", response, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);

    for (var i = 0; i < 4; i++) {
        songs.push(
            new song(
                artistSummary.snapshotItem(i).nodeValue,
                songTitle.snapshotItem(i).nodeValue,
                albumTitle.snapshotItem(i).nodeValue,
                (artRadio.snapshotItem(i).firstChild ? artRadio.snapshotItem(i).firstChild.nodeValue : "images/cover.png"),
                artistId.snapshotItem(i).nodeValue,
                audioURL.snapshotItem(i).nodeValue.slice(0, -48) + decrypt(audioURL.snapshotItem(i).nodeValue.substr(-48)),
                stationId.snapshotItem(i).nodeValue,
                musicId.snapshotItem(i).nodeValue,
                userSeed.snapshotItem(i).nodeValue,
                rating.snapshotItem(i).nodeValue,
                (songType.snapshotItem(i) ? songType.snapshotItem(i).nodeValue : ""),
                albumDetailURL.snapshotItem(i).nodeValue,
                artistDetailURL.snapshotItem(i).nodeValue,
                songDetailURL.snapshotItem(i).nodeValue
            )
        );
    }
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
function sendRequest(method, request, handler) {
    $.ajax({
        type: "POST",
        url: 'https://tuner.pandora.com/services/json/?method='+method,
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