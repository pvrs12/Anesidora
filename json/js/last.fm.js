var API_KEY = "57a64ec9cf4085be8326e0a52076926c";
var API_SEC = "f94deaf6ddb19798ea6a91e4f3584513";
function lastFmSession(username, password) {
    var authToken = MD5(username + MD5(password));
    var sig = MD5("api_key" + API_KEY + "authToken" + authToken + "methodauth.getMobileSessionusername" + username + API_SEC);
    var URL = "http://ws.audioscrobbler.com/2.0/?method=auth.getMobileSession&api_key=" + API_KEY + "&api_sig=" + sig;
    URL += "&username=" + username + "&authToken=" + authToken;
    var http = new XMLHttpRequest();
    var timeout = setTimeout(
                    function () {
                        http.abort();
                        return;
                    },
                  3000);
    http.open("GET", URL, false);
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            console.log(http.responseXML);
            if (http.responseXML.getElementsByTagName('lfm')[0].attributes.getNamedItem("status").value == "ok") {
                localStorage.lastFmUsername = http.responseXML.getElementsByTagName('name')[0].firstChild.nodeValue;
                localStorage.lastFmSession = http.responseXML.getElementsByTagName('key')[0].firstChild.nodeValue;
            }
        }
    }
    http.send();
}
function lastFmNowPlaying() {
    var sig = "album" + currentSong.albumName
    sig += "api_key" + API_KEY;
    sig += "artist" + currentSong.artistName;
    sig += "method" + "track.updateNowPlaying";
    sig += "sk" + localStorage.lastFmSession;
    sig += "track" + currentSong.songName;
    sig += API_SEC;
    sig = MD5(sig);
    var URL = "http://ws.audioscrobbler.com/2.0/?method=track.updateNowPlaying&api_key=" + API_KEY + "&sk=" + localStorage.lastFmSession + "&api_sig=" + sig;
    URL += "&artist=" + escape(currentSong.artistName) + "&track=" + escape(currentSong.songName) + "&album=" + escape(currentSong.albumName);
    var http = new XMLHttpRequest();
    var timeout = setTimeout(
                    function () {
                        http.abort();
                        return;
                    },
                  3000);
    http.open("POST", URL, false);
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
//            console.log(http.responseXML);
        }
    }
    http.send();
}
function lastFmScrobble() {
    var sig = "album" + currentSong.albumName;
    sig += "api_key" + API_KEY;
    sig += "artist" + currentSong.artistName;
    sig += "method" + "track.scrobble";
    sig += "sk" + localStorage.lastFmSession;
    sig += "timestamp" + currentSong.startTime;
    sig += "track" + currentSong.songName;
    sig += API_SEC;
    sig = MD5(sig);
    var URL = "http://ws.audioscrobbler.com/2.0/?method=track.scrobble&api_key=" + API_KEY + "&sk=" + localStorage.lastFmSession + "&api_sig=" + sig;
    URL += "&album=" + escape(currentSong.albumName) + "&artist=" + escape(currentSong.artistName) + "&track=" + escape(currentSong.songName) + "&timestamp=" + escape(currentSong.startTime);
    var http = new XMLHttpRequest();
    var timeout = setTimeout(
                    function () {
                        http.abort();
                        return;
                    },
                  3000);
    http.open("POST", URL, false);
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
//            console.log(http.responseXML);
        }
    }
    http.send();


}