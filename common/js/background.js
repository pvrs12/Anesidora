/*global $, partnerLogin, getPlaylist, mp3Player, currentPlaylist, platform_specific, get_browser, is_android*/
/*exported setCallbacks, play, downloadSong, nextSongStation*/

var callback;
var currentSong;
var comingSong;
var prevSongs = [];

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
        localStorage.lastStation = stationToken;
        nextSong();
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
    localStorage.lastStation = station;
    getPlaylist(localStorage.lastStation);
    comingSong = undefined;
    nextSong();
}

function nextSong(depth=1) {
    if (depth > 4){
        // console.log("What? We recursed down 4 times?");
        return;
    }
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
        // console.log("Downloading alternate url");
        // console.log(currentSong);
        url = currentSong.additionalAudioUrl;
    } else {
        // console.log("Downloading normal url");
        // console.log(currentSong);
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
        if (currentSong.songRating != "1") {
            prevSongs.push(currentSong);
            //console.log("History Num = "+localStorage.historyNum);
            while(prevSongs.length > localStorage.historyNum){
                prevSongs.shift();
            }
        }
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
        //console.log(err);
        //if (errorCount > 3) {
        //  alert("There seems to be an issue with Anesidora. To prevent Pandora account lockout Anesidora has been stopped.");
        //  return;
        //}
    });
});