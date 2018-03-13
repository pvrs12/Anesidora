/*jslint browser:true*/
/*global $, browser, partnerLogin, getPlaylist, mp3Player, currentPlaylist*/

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
    if (stationToken != localStorage.lastStation) {
        currentSong = undefined;
        getPlaylist(stationToken);
        localStorage.lastStation = stationToken;
        nextSong();
    } else {
        if (currentSong == undefined) {
            getPlaylist(localStorage.lastStation);
        }
        if (document.getElementById("mp3Player").currentTime > 0) {
            mp3Player.play();
        } else {
            nextSong();
        }
    }
}

function nextSong() {
    if (currentPlaylist === undefined) {
        getPlaylist(localStorage.lastStation);
    }
    if (currentSong === undefined) {
        while (currentSong === undefined) {
            currentSong = currentPlaylist.shift();
        }
    } else {
        currentSong = comingSong;
    }
    if (currentPlaylist.length === 0) {
        getPlaylist(localStorage.lastStation);
    }
    comingSong = currentPlaylist.shift();

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
        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", currentSong.albumArtUrl);
        xhr.responseType = "blob";
        xhr.onload = function(){
            var blob = this.response;
            options.iconUrl = window.URL.createObjectURL(blob);
        };
        xhr.send(null);
    }
    if (currentSong.additionalAudioUrl != null) {
        mp3Player.setAttribute("src", currentSong.additionalAudioUrl);
    }
    else {
        mp3Player.setAttribute("src", currentSong.audioUrlMap.highQuality.audioUrl);
    }
    mp3Player.play();
}

function downloadSong() {
    var url = '';
    if (currentSong.additionalAudioUrl != null) {
        console.log('Downloading alternate url');
        console.log(currentSong);
        url = currentSong.additionalAudioUrl;
    } else {
        console.log('Downloading normal url');
        console.log(currentSong);
        url = currentSong.audioUrlMap.highQuality.audioUrl;
    }
    callback.downloadSong(url, currentSong.songName);
}

if (localStorage.username !== '' && localStorage.password !== '') {
    partnerLogin();
}

$(document).ready(function () {
    'use strict';


    var platform_promise = browser.runtime.getPlatformInfo();
    platform_promise.then(function (info) {
        var isAndroid = info.os === "android";
        if (!isAndroid) {
            browser.browserAction.setPopup({popup: "/popup.htm"});
        }
    });
    if (localStorage.volume) {
        mp3Player.volume = localStorage.volume;
    } else {
        mp3Player.volume = 0.1;
    }
    browser.browserAction.onClicked.addListener(() => {
        browser.tabs.create({
            url: "/popup.htm"
        });
    });

    $('#mp3Player').bind('play', function () {
        try {
            //check if the window exists
            String($('#mp3Player'))
            callback.updatePlayer();
            currentSong.startTime = Math.round(new Date().getTime() / 1000);
        } catch (e) {
            //if it doesn't exist, don't draw here
            return;
        }
    }).bind('ended', function () {
        if (currentSong.songRating != '1') {
            prevSongs.push(currentSong);
            //console.log('History Num = '+localStorage.historyNum);
            while(prevSongs.length > localStorage.historyNum){
                prevSongs.shift();
            }
        }
        nextSong();
    }).bind('timeupdate', function () {
        try {
            //check if the window exists
            String($('#mp3Player'))
            callback.drawPlayer();
        } catch(e){
            //if it doesn't, don't draw here
            return;
        }
    }).bind('error', function () {
        //console.log(err);
        //if (errorCount > 3) {
            //alert("There seems to be an issue with Anesidora. To prevent Pandora account lockout Anesidora has been stopped.");
            //return;
        //}
    })
});