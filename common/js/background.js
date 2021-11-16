"use strict";
/*global getPlaylist, currentPlaylist, platform_specific, get_browser, is_android*/
/*exported setCallbacks, play, downloadSong, nextSongStation, mp3Player*/

let mp3Player = document.getElementById("mp3Player");

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
            "http://*.pandora.com/services/json/*",
            "https://*.pandora.com/services/json/*",
        ]
    },
    ["blocking", "requestHeaders"]
);

var callbacks = {
    updatePlayer: [],
    drawPlayer: [],
    downloadSong: []
};
var currentSong;
var comingSong;
var prevSongs = [];
var stationImgs = (localStorage.stationImgs && JSON.parse(localStorage.stationImgs)) || {

};

function setCallbacks(updatePlayer,drawPlayer,downloadSong){
    callbacks.updatePlayer.push(updatePlayer);
    callbacks.drawPlayer.push(drawPlayer);
    callbacks.downloadSong.push(downloadSong);
}

async function play(stationToken) {
    if (stationToken !== localStorage.lastStation) {
        currentSong = undefined;
        await getPlaylist(stationToken);
        //adding this so album covers get on the right location
        let prev_station = localStorage.lastStation;
        localStorage.lastStation = stationToken;
        await nextSong(1, prev_station);
    } else {
        if (currentSong === undefined) {
            await getPlaylist(localStorage.lastStation);
        }
        if (mp3Player.currentTime > 0) {
            mp3Player.play();
        } else {
            await nextSong();
        }
    }
}

async function nextSongStation(station) {
    //adding this so album covers get on the right location
    let prev_station = localStorage.lastStation;
    localStorage.lastStation = station;
    await getPlaylist(localStorage.lastStation);
    comingSong = undefined;
    //adding this so album covers get on the right location
    nextSong(1, prev_station);
}

async function nextSong(depth=1, prev_station=undefined) {
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
        stationImgs[prev_station] = (currentSong.albumArtUrl || stationImgs[prev_station]) || undefined; 
        localStorage.stationImgs = JSON.stringify(stationImgs);
        if (currentSong != prevSongs[prevSongs.length-1]) {
            prevSongs.push(currentSong);
            while(prevSongs.length > localStorage.historyNum){
                prevSongs.shift();
            }
        }
    }

    if (!currentPlaylist || currentPlaylist.length === 0) {
        await getPlaylist(localStorage.lastStation);
    }

    if (comingSong === undefined && currentPlaylist.length > 0) {
        comingSong = currentPlaylist.shift();
    }
    currentSong = comingSong;

    //in case the most recent shift emptied the playlist
    if (currentPlaylist.length === 0) {
        await getPlaylist(localStorage.lastStation);
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

function setup_commands() {
    try {
        if (!is_android()) {
            try {
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
            } catch (TypeError) {
                // Just in case Android
            }
        }
    } catch (TypeError) {
        //Once again Android isn't being detected properly
    }
}

function setup_mediasession() {
    if (!("mediaSession" in navigator)) {
        return;
    }

    navigator.mediaSession.setActionHandler("play", async function() {
        if(mp3Player.paused) {
            play(localStorage.lastStation);
        }
    });
    navigator.mediaSession.setActionHandler("pause", async function() {
        if(!mp3Player.paused) {
            mp3Player.pause();
        }
    });
    navigator.mediaSession.setActionHandler("nexttrack", async function() {
        nextSong();
    });
    navigator.mediaSession.setActionHandler("seekto", function(details) {
        mp3Player.currentTime = details.seekTime;
    });
}

function update_mediasession() {
    if (!("mediaSession" in navigator)) {
        return;
    }

    // https://github.com/snaphat/pandora_media_session/blob/main/pandora_media_session.user.js#L45
    // Populate metadata
    var metadata = navigator.mediaSession.metadata;
    if (!metadata || (
        metadata.title != currentSong.songName ||
        metadata.artist != currentSong.artistName ||
        !metadata.artwork ||
        metadata.artwork.length === 0 ||
        metadata.artwork[0].src != currentSong.albumArtUrl)
    ) { 
        navigator.mediaSession.metadata = new window.MediaMetadata({
            title: currentSong.songName,
            artist: currentSong.artistName,
            artwork: currentSong.albumArtUrl ? [{ src: currentSong.albumArtUrl, sizes: "500x500", type: "image/jpeg" }] : []
        });
    }

    if (mp3Player.paused) {
        navigator.mediaSession.playbackState = "paused";
    } else {
        navigator.mediaSession.playbackState = "playing";

        if (mp3Player.duration) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: mp3Player.duration,
                    position: mp3Player.currentTime,
                    playbackRate: 1
                });
            } catch (e) {
                // duration is probably NaN
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    mp3Player = document.getElementById("mp3Player");

    if (localStorage.volume) {
        mp3Player.volume = localStorage.volume;
    } else {
        mp3Player.volume = 0.1;
    }

    platform_specific(get_browser());

    setup_commands();

    setup_mediasession();

    mp3Player = document.getElementById("mp3Player");

    mp3Player.addEventListener("play", function () {
        try {
            //check if the window exists
            document.getElementById("mp3Player").yep = "thisexists";
            callbacks.updatePlayer.forEach((e) => {
                try {
                    e();
                } catch(b) {
                    callbacks.updatePlayer.splice(callbacks.updatePlayer.indexOf(e), 1);
                }
            });
            currentSong.startTime = Math.round(new Date().getTime() / 1000);
            update_mediasession();
        } catch (e) {
            //if it doesn"t exist, don"t draw here
            return;
        }
    });
    mp3Player.addEventListener("pause", function () {
        update_mediasession();
    });
    mp3Player.addEventListener("ended", function () {
        nextSong();
        update_mediasession();
    });
    mp3Player.addEventListener("timeupdate", function () {
        update_mediasession();
        try {
            //check if the window exists
            document.getElementById("mp3Player").yep = "thisexists";
            callbacks.drawPlayer.forEach((e) => {
                try {
                    e();
                } catch(b) {
                    callbacks.drawPlayer.splice(callbacks.drawPlayer.indexOf(e), 1);
                }
            });
        } catch(e){
            //if it doesn"t, don"t draw here
            return;
        }
    });
    mp3Player.addEventListener("error", function () {
    });
});
