/*global $, partnerLogin, getPlaylist, mp3Player, currentPlaylist, platform_specific, get_browser, is_android*/
/*exported setCallbacks, play, downloadSong, nextSongStation*/


get_browser().webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        const h = details.requestHeaders;
        for (let header of h) {
            if (header.name.toLowerCase() === "user-agent") {
                header.value = "libcurl";
            }
        }
        return {requestHeaders: h};
    },
    {
        urls: [
            "http://*.pandora.com/*",
            "https://*.pandora.com/*",
            "http://*.p-cdn.com/*",
            "http://*.p-cdn.us/*"
        ]
    },
    ['blocking', 'requestHeaders']
);

var callback;
var currentSong;
var comingSong;
var prevSongs = [];
var stationImgs = (localStorage.stationImgs && JSON.parse(localStorage.stationImgs)) || {

};

function setCallbacks(updatePlayer,drawPlayer,downloadSong){
    callback = {
        "updatePlayer": updatePlayer,
        "drawPlayer": drawPlayer,
        "downloadSong": downloadSong
    };
}

function play(stationToken) {
    if (stationToken !== localStorage.lastStation) {
        currentSong = undefined;
        getPlaylist(stationToken);
        //adding this so album covers get on the right location
        let prev_station = localStorage.lastStation;
        localStorage.lastStation = stationToken;
        nextSong(1, prev_station);
    } else {
        if (currentSong === undefined) {
            getPlaylist(localStorage.lastStation);
        }
        if (document.getElementById("mp3Player").currentTime > 0) {
            mp3Player.play();
        } else {
            nextSong();
        }
    }
}

function nextSongStation(station) {
    //adding this so album covers get on the right location
    let prev_station = localStorage.lastStation;
    localStorage.lastStation = station;
    getPlaylist(localStorage.lastStation);
    comingSong = undefined;
    //adding this so album covers get on the right location
    nextSong(1, prev_station);
}

function nextSong(depth=1, prev_station=undefined) {
    if (depth > 4){
        return;
    }
    if (!prev_station) {
        //if the "prev_station" does not have a definition
        //then we didn't swap, use the existing one
        prev_station = localStorage.lastStation;
    }

    /* I (hucario) put this over here so that history and station art works for every song change. */
    if (currentSong) {
        stationImgs[prev_station] = (currentSong.albumArtUrl || stationImgs[prev_station]) || "/images/new/default_album.svg"; 
        // try for a new cover; if that doesn't work, keep the old; if there is no old, go for a default one
        localStorage.stationImgs = JSON.stringify(stationImgs);
        if (currentSong != prevSongs[prevSongs.length-1]) {
            prevSongs.push(currentSong);
            while(prevSongs.length > localStorage.historyNum){
                prevSongs.shift();
            }
        }
    }
    /* /paste */

    if (currentPlaylist === undefined || currentPlaylist.length === 0) {
        getPlaylist(localStorage.lastStation);
    }
    if (comingSong === undefined) {
        comingSong = currentPlaylist.shift();
    }
    currentSong = comingSong;

    //in case the most recent shift emptied the playlist
    if (currentPlaylist.length === 0) {
        getPlaylist(localStorage.lastStation);
    }
    comingSong = currentPlaylist.shift();

    let song_url;
    if (currentSong.additionalAudioUrl != null) {
        song_url = currentSong.additionalAudioUrl;
    } else {
        song_url = currentSong.audioUrlMap.highQuality.audioUrl;
    }
    mp3Player.setAttribute("src", song_url);
    mp3Player.play();

    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", song_url);
    xhr.onerror = function () {
        nextSong(depth + 1);
    };
    xhr.onload = function() {
        if (xhr.status >= 300){
            //purge the current list, then run this function again
            nextSong(depth + 1);
        }

        if (localStorage.notifications === "true") {
            var options = {
                type: "list",
                title: "Now playing:\r\n" + currentSong.artistName + " - " + currentSong.songName,
                message: "by " + currentSong.artistName,
                eventTime: 5000,
                items: [
                    { title: "", message: "Coming next: " },
                    { title: "", message: comingSong.artistName + " - " + comingSong.songName }
                ]
            };

            var xhr2 = new XMLHttpRequest();
            xhr2.open("GET", currentSong.albumArtUrl);
            xhr2.responseType = "blob";
            xhr2.onload = function(){
                var blob = this.response;
                options.iconUrl = window.URL.createObjectURL(blob);
            };
            xhr2.send(null);
        }
    };
    xhr.send();
}

function downloadSong() {
    var url = "";
    if (currentSong.additionalAudioUrl != null) {
        url = currentSong.additionalAudioUrl;
    } else {
        url = currentSong.audioUrlMap.highQuality.audioUrl;
    }
    callback.downloadSong(url, currentSong.songName);
}

if (localStorage.username !== "" && localStorage.password !== "") {
    partnerLogin();
}

function setup_commands() {
    if (!is_android()) {
        get_browser().commands.onCommand.addListener(function(command) {
            if (command === "pause_play") {
                if (!mp3Player.paused) {
                    mp3Player.pause();
                } else {
                    play(localStorage.lastStation);
                }
            } else if(command === "skip_song") {
                nextSong();
            }
        });
    }
}

$(document).ready(function () {
    "use strict";
    if (localStorage.volume) {
        mp3Player.volume = localStorage.volume;
    } else {
        mp3Player.volume = 0.1;
    }

    platform_specific(get_browser());

    setup_commands();

    $("#mp3Player").bind("play", function () {
        try {
            //check if the window exists
            String($("#mp3Player"));
            callback.updatePlayer();
            currentSong.startTime = Math.round(new Date().getTime() / 1000);
        } catch (e) {
            //if it doesn"t exist, don"t draw here
            return;
        }
    }).bind("ended", function () {
        nextSong();
    }).bind("timeupdate", function () {
        try {
            //check if the window exists
            String($("#mp3Player"));
            callback.drawPlayer();
        } catch(e){
            //if it doesn"t, don"t draw here
            return;
        }
    }).bind("error", function () {
    });
});
