var callback;
var currentSong;
var comingSong;
var prevSongs = new Array();
var errorCount = 0;
$(document).ready(
function () {
    if (localStorage.volume) {
        mp3Player.volume = localStorage.volume;
    }
    else {
        mp3Player.volume = .1;
    }
    $('#mp3Player')
    .bind('play', function () {
        callback.updatePlayer();
        currentSong.startTime = Math.round(new Date().getTime() / 1000);
        if (localStorage.lastFm == "true") {
            lastFmNowPlaying();
        }
    })
    .bind('ended', function () {
        if (localStorage.lastFm == "true") {
            lastFmScrobble();
        }
        if (currentSong.songRating != '1') {
            if (prevSongs.push(currentSong) == 5) {
                prevSongs.shift();
            }
        }
        errorCount = 0;
        nextSong();
    })
    .bind('timeupdate', function () {
        callback.drawPlayer();
    })
    .bind('error', function () {
        if (errorCount > 3) {
            alert("There seems to be an issue with Anesidora. To prevent Pandora account lockout Anesidora has been stopped.");
            return;
        }
        errorCount++;
        nextSong();
    })
});
if (localStorage.username != '' && localStorage.password != '') {
    partnerLogin();
}
function setCallbacks(updatePlayer,drawPlayer,downloadSong){
	callback={"updatePlayer":updatePlayer,"drawPlayer":drawPlayer,"downloadSong":downloadSong};
}
function play(stationToken) {
    if (stationToken != localStorage.lastStation) {
        currentSong = undefined;
        getPlaylist(stationToken);
        localStorage.lastStation = stationToken;
        nextSong();
    }
    else {
        if (currentSong == undefined) {
            getPlaylist(localStorage.lastStation);
        }
        if (document.getElementById("mp3Player").currentTime > 0) {
            mp3Player.play();
        }
        else {
            nextSong();
        }
    }
}
function nextSong() {
    if (currentSong == undefined) {
        while (currentSong == undefined) {
            currentSong = currentPlaylist.shift();
        }
    }
    else {
        currentSong = comingSong;
    }
    if (currentPlaylist.length == 0) {
        getPlaylist(localStorage.lastStation);
    }
    comingSong = currentPlaylist.shift();

    if (localStorage.notifications == "true") {
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
	var url='';
	if (currentSong.additionalAudioUrl != null) {
		console.log('Downloading alternate url');
		console.log(currentSong);
		url=currentSong.additionalAudioUrl;
	}	else {
		console.log('Downloading normal url');
		console.log(currentSong);
		url=currentSong.audioUrlMap.highQuality.audioUrl;
	}
	callback.downloadSong(url,currentSong.songName);
}

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-43432184-3']);
_gaq.push(['_trackPageview']);
(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

