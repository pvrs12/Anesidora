/*globals $, get_browser, default_width, default_height*/

//https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript#answer-10074204
function zeroPad(num, places) {
    "use strict";
    if (num.toString().length >= places) {
        return num;
    }
    return String(Math.pow(10, places) + Math.floor(num)).substring(1);
}

var currentPanel = null;

var background = get_browser().extension.getBackgroundPage();

function initBodySize() {
    "use strict";
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = default_width;
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = default_height;
    }
    $("#bodyWidth").val(localStorage.bodyWidth);
    $("#bodyHeight").val(localStorage.bodyHeight);
}

const panels = ["historyPanel", "leftPanel", "midPanel", "rightPanel"];
const panelHolder = document.getElementById('anesidora');
var tabsInit = false;
var panelOn = 0;
function goToPanel(which) {
    "use strict";
	if (!tabsInit) return;
	if (which == 0) {
		updateHistory();
	}
	panelOn = which;
	for (let i = 0; i < panels.length; i++) {
		document.getElementById(panels[i]).style.left = "calc(var(--width) * "+(i-which)+")";
	}
	
}

function initTabs() {
	"use strict"
	for (let i = 0; i < panels.length; i++) {
		document.getElementById(panels[i]).style.left = "calc(var(--width) * "+i+")";
	}
	tabsInit = true;
}

function goToLogin() {
    "use strict";
    goToPanel(3);
}

function goToStations() {
    "use strict";
    goToPanel(2);
}

function goToPlayer() {
    "use strict";
    goToPanel(1);
}

function clearHistory() {
    "use strict";
    while (historyDiv.hasChildNodes()) {
        historyDiv.removeChild(historyDiv.firstChild);
    }
}

function downloadSong(url, title) {
    "use strict";
    //making an anchor tag and clicking it allows the download dialog to work and save the file with the song"s name

    //trim the title of the song to 15 characters... not a perfect solution, but there were issues with it at full length
    title = title.substring(0, 15);
    var a = $("<a href=\"" + url + "\" download=\"" + title + ".mp4\">HELLO</a>");
    a.appendTo("body");
    a[0].click();
    a.remove();
}

function updateHistory() {
    "use strict";
    clearHistory();
	const historyDiv = document.getElementById('historyDiv');
    background.prevSongs.reverse().forEach(function (song, i) {
    	
    	let elem = document.createElement('div');
    	elem.classList.add('historyItem');
    	let cover = document.createElement('div');
    	cover.classList.add('historyCover');
        let overlay = document.createElement('div');
        overlay.classList.add('historyOverlay');
        let holder = document.createElement('div');
        holder.classList.add('holder');
        let actions = document.createElement('div');
        actions.classList.add('actions');
        let likeAction = document.createElement('img');
        likeAction.classList.add('like');
        likeAction.classList.add('hoverImg');
        let downloadAction = document.createElement('img');
        downloadAction.classList.add('download');
        downloadAction.classList.add('hoverImg');
        let dislikeAction = document.createElement('img');
        dislikeAction.classList.add('dislike');
        dislikeAction.classList.add('hoverImg');
        let nameSpan = document.createElement('span');
        
        historyDiv.appendChild(elem);
        elem.appendChild(holder);
        if (song.albumArtUrl) {
	        cover.style.background = `url("${song.albumArtUrl}")`;
	    } else {
	    	cover.style.background = 'url("/images/New/default_album.svg")';
	    }
	    holder.appendChild(cover);
        holder.appendChild(overlay);
        overlay.appendChild(actions);
        actions.appendChild(likeAction);
		
        let likeStatus = "like";
        if (song.songRating == -1) {
        	likeStatus = "disliked";
        } else if (song.songRating == 0) {
        	likeStatus = "like";
        } else if (song.songRating == 1) {
        	likeStatus = "liked";
        }
        likeAction.src = "images/New/"+(likeStatus=="liked"?"liked":"like")+".svg";
        actions.appendChild(downloadAction);
        downloadAction.src = "images/New/download.svg";
        actions.appendChild(dislikeAction);
        dislikeAction.src = "images/New/"+(likeStatus=="disliked"?"disliked":"dislike")+".svg";
        elem.appendChild(nameSpan);
        nameSpan.innerText = song.songName;
        let historyNum = i,
			thisSong = song; // I, too, had your problem, until I discovered the magic of 'let'!
        cover.addEventListener('click', () => {
        	get_browser().tabs.create({
        		'url': thisSong.songDetailUrl
        	});
        });
        likeAction.addEventListener('click', (e) => {
        	if (likeStatus == 'liked') {
        		return;
        	}
        	background.addFeedback(historyNum, 1);
        	likeAction.src = "images/New/liked.svg";
        	dislikeAction.src = "images/New/dislike.svg";
        	likeStatus = "liked";
        	e.preventDefault(e);
        });
        downloadAction.addEventListener('click', (e) => {
        	downloadSong(song.audioUrlMap.highQuality.audioUrl, song.songName);
        	e.preventDefault(e);
        });
        dislikeAction.addEventListener('click', (e) => {
        	if (likeStatus == 'disliked') {
        		return;
        	}
        	background.addFeedback(historyNum, -1);
        	dislikeAction.src = "images/New/disliked.svg";
        	likeAction.src = "images/New/like.svg";
        	likeStatus = "disliked";
        	e.preventDefault(e);
        });
    });
}

function goToHistory() {
    "use strict";
    goToPanel(0);
    updateHistory();
}

function refreshStationList() {
    "use strict";
    let list = document.getElementById("stationListDiv");
    while(list.lastChild) {
        list.removeChild(list.lastChild);
    }
    addStations();
}

function refreshStations() {
    "use strict";
    background.getStationList();

    setTimeout(refreshStationList, 1000);
}
var stationCallbacks = [];

function updateStationCovers() {
	for (let i = 0; i < stationCallbacks.length; i++) {
		stationCallbacks[i]();
	}
}

function addStations() {
    "use strict";
    let filter = document.getElementById("stationFilterInput").value;
    
    background.stationList.sort((a, b) => {
        return a.stationName.localeCompare(b.stationName)
    });
	stationCallbacks = [];
    background.stationList.filter((station) => {
        if (!filter) {
            return true;
        }
        return station.stationName.toLowerCase().includes(filter.toLowerCase());
    }).forEach(function (station) {
    	if (!background.stationImgs[station.stationId]) {
    		background.stationImgs[station.stationId] = "/images/New/default_album.svg";
    	}
    	let elem = document.createElement('div');
    	elem.classList.add('historyItem');
    	let cover = document.createElement('div');
    	cover.classList.add('historyCover');
        let overlay = document.createElement('div');
        overlay.classList.add('historyOverlay');
        let holder = document.createElement('div');
        holder.classList.add('holder');
        let actions = document.createElement('div');
        actions.classList.add('actions');
        let playAction = document.createElement('img');
        playAction.classList.add('hoverImg');
        let nameSpan = document.createElement('span');
        
        document.getElementById('stationListDiv').appendChild(elem);
        elem.appendChild(holder);
        cover.style.background = `url("${background.stationImgs[station.stationId]}")`;
	    holder.appendChild(cover);
        holder.appendChild(overlay);
        overlay.appendChild(actions);
        actions.appendChild(playAction);
		playAction.src = "/images/New/player.svg";
        elem.appendChild(nameSpan);
        nameSpan.innerText = station.stationName;
        let thisStation = station;
        if (station.stationDetailUrl != "") {
	        cover.addEventListener('click', () => {
	        	get_browser().tabs.create({
	        		'url': station.stationDetailUrl
	        	});
	        });
	    }
	    playAction.addEventListener('click', () => {
	    	background.play(thisStation.stationToken);
	    	goToPanel(1);
	    	handleSwitch();
	    });
	    stationCallbacks.push(() => {
	    	cover.style.background = `url("${background.stationImgs[thisStation.stationId]}")`;
	    });
    });
}

function updatePlayer() {
    "use strict";
    if (background.currentSong) {
        $("#coverArt").unbind().bind("click", function () {
            get_browser().tabs.create({
                "url": background.currentSong.albumDetailUrl
            });
        }).attr("src", background.currentSong.albumArtUrl);
        $("#artistLink").unbind().text(background.currentSong.artistName);
        $("#titleLink").unbind().text(background.currentSong.songName);
        $("#artistLink").unbind().bind("click", function () {
            get_browser().tabs.create({
                "url": background.currentSong.artistDetailUrl
            });
        }).text(background.currentSong.artistName);
        $("#titleLink").unbind().bind("click", function () {
            get_browser().tabs.create({
                "url": background.currentSong.songDetailUrl
            });
        }).text(background.currentSong.songName);
        $("#dash").text(" - ");
        if (background.currentSong.songRating) {
            $("#tUpButton").unbind("click").attr("src", "images/New/liked.svg");
        } else {
            $("#tUpButton").attr("src", "images/New/like.svg");
            $("#tUpButton").click(function () {
                background.addFeedback(-1, true);
                $("#tUpButton").attr("src", "images/New/liked.svg");
                $("#tUpButton").unbind("click");
            });
        }
    }

    if (background.mp3Player.paused) {
        $("#playButton").show();
        $("#pauseButton").hide();
    } else {
        $("#playButton").hide();
        $("#pauseButton").show();
    }

    
    $("#scrubber").slider({
        value: 0
    });
    updateStationCovers();
}

function drawPlayer() {
    "use strict";
    var curMinutes = Math.floor(background.mp3Player.currentTime / 60),
        curSecondsI = Math.ceil(background.mp3Player.currentTime % 60),
        curSeconds = zeroPad(curSecondsI.length === 1
            ? "0" + curSecondsI
            : curSecondsI, 2),
        totalMinutes = Math.floor(background.mp3Player.duration / 60),
        totalSecondsI = Math.ceil(background.mp3Player.duration % 60),
        totalSeconds = zeroPad(totalSecondsI.length === 1
            ? "0" + totalSecondsI
            : totalSecondsI, 2);

    $("#scrubber").slider({
        value: (background.mp3Player.currentTime / background.mp3Player.duration) * 100
    }).attr("title", curMinutes + ":" + curSeconds + "/" + totalMinutes + ":" + totalSeconds);
}

document.documentElement.style.setProperty('--height', localStorage.bodyHeight +'px');
document.documentElement.style.setProperty('--width', localStorage.bodyWidth+'px');
$(document).ready(function () {
    "use strict";
    $("body").bind("click", function (e) {
        if (e.target.id !== "artistLink" && e.target.id !== "titleLink") {
            $(".details").hide();
        }
    });
    initBodySize();
	
    document.documentElement.style.setProperty('--height', localStorage.bodyHeight +'px');
	document.documentElement.style.setProperty('--width', localStorage.bodyWidth+'px');
	
//    var scrollerWidth = $("body").width() * 0.6;
//    $(".scrollerContainer").width(scrollerWidth);
    $("#volume").css({
        "height": $("body").height() - 5
    });
    $("#coverArt").css({
        "min-width": Math.min($("body").height() * 0.75, $("body").width() * 0.1)
    });
    initTabs();
    

    if (background.mp3Player.paused) {
        $("pauseButton").hide();
        $("playButton").show();
    } else {
        $("pauseButton").show();
        $("playButton").hide();
    }

    $("#scrubber").slider({
        range: "min",
        min: 0,
        slide: function (ignore, ui) {
            background.mp3Player.currentTime = background.mp3Player.duration * (ui.value / 100);
        },
        change: function (ignore, ui) {
            $(ui.handle).removeClass("ui-state-focus");
        }
    });

    $("#playButton").bind("click", function () {
        play_audio();
    });
    $("#pauseButton").bind("click", function () {
        pause_audio();
    });
    $("#skipButton").bind("click", background.nextSong);
    $("#tUpButton").bind("click", function () {
        background.addFeedback(-1, true);
        if (background.currentSong.songRating === true) {
            $("#tUpButton").unbind("click").attr("src", "images/New/liked.svg");
        }
    });
    $("#tDownButton").bind("click", function () {
        background.addFeedback(-1, false);
        setTimeout(function () {
            background.nextSong();
        }, 1000); // Small delay to stop extension from freezing for some reason
    });
    $("#sleepButton").bind("click", function () {
        background.sleepSong();
        background.nextSong();
    });
    $("#downloadButton").bind("click", function () {
        background.downloadSong();
    });
    $("#moreInfoButton").bind("click", function () {
        window.open("options.htm", "_blank");
    });
    $("#volume").slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 70,
        value: (localStorage.volume)
            ? localStorage.volume * 100
            : 20,
        slide: function (ignore, ui) {
            background.mp3Player.volume = ui.value / 100;
        },
        stop: function (ignore, ui) {
            $(ui.handle).removeClass("ui-state-focus");
            localStorage.volume = ui.value / 100;
        }
    });
    $("#unWarning").hide();
    $("#pwWarning").hide();
    $("#login").bind("submit", function () {
        localStorage.username = $("#username").val();
        localStorage.password = $("#password").val();
        background.partnerLogin();
        if (background.userAuthToken === "") {
            document.getElementById("li1").classList.add('warning');
            document.getElementById("li2").classList.add('warning');
            return false;
        } else {
            addStations();
            //move to mid panel
            goToStations();
            return false;
        }
    });

    $("#stationFilterInput").bind("keypress change input paste", () => {
        refreshStationList();
    });
	let lockRotate = false;
    $("#stationRefreshButton").bind("click", () => {
    	if (!lockRotate) {
	    	document.getElementById('stationRefreshButton').style.animation = "rotate 500ms ease-in-out";
	    	lockRotate = true;
	    }
        refreshStations();
        setTimeout(() => {
	    	document.getElementById('stationRefreshButton').style.animation = "";
	    	lockRotate = false;
        }, 500);
    });

    // document.getElementById("stationFilterInput").addEventListener("keypress", () => {
    //     refreshStationList();
    // });

    if (background.stationList !== undefined) {
        addStations();
    }
    if (localStorage.username === undefined
            || localStorage.password === undefined
            || background.userAuthToken === undefined
            || localStorage.username.length === 0
            || localStorage.password.length === 0
            || background.userAuthToken.length === 0) {
        goToLogin();
    } else {
        if (!localStorage.lastStation) {
            goToStations();
        }
        if (localStorage.lastStation) {
            goToPlayer();
        }
    }


    const scrollerText = document.getElementsByClassName('scrollerText')[0];
	scrollerText.addEventListener('mouseover', () => {
	    if ($('.scrollerText').width() - $('#nowPlayingContainerCell').width() > 0) {
			$(".scrollerText").css({
				transition: 'left '+ (($('.scrollerText').width() - $('#nowPlayingContainerCell').width())*30) + 'ms linear',
				left: $('#nowPlayingContainerCell').width() - $('.scrollerText').width()
			});
	    } else {
	    	$('.scrollerText').css({
	    		left: '0px'
	    	});
	    }
	});
	scrollerText.addEventListener('mouseleave', () => {
	    //move it to left immediately
	    $('.scrollerText').css({
	        left: 0
	    });
	});

    if (background.mp3Player.src !== "") {
        if (background.mp3Player.currentTime > 0) {
            updatePlayer();
            drawPlayer();
        }
    } else {
        updatePlayer();
    }
    handleSwitch();
    document.querySelector('#prevTab > span').addEventListener('click', () => {
    	if (panelOn > 0) {
    		goToPanel(panelOn-1);
    	}
		handleSwitch();
    });
    document.querySelector('#nextTab > span').addEventListener('click', () => {
    	if (panelOn < 2) {
    		goToPanel(panelOn+1);
    	}
		handleSwitch();
    });
    updateHistory();
});
function handleSwitch() {
	if (panelOn <= 0) {
		document.querySelector('#prevTab > span').style.opacity = "0";
		document.querySelector('#prevTab > span').style.pointerEvents = 'none';
	} else {
		document.querySelector('#prevTab > span').style.opacity = "";
		document.querySelector('#prevTab > span').style.pointerEvents = "";
	}
	if (panelOn >= 2) {
		document.querySelector('#nextTab > span').style.opacity = "0";
		document.querySelector('#nextTab > span').style.pointerEvents = 'none';
	} else {
		document.querySelector('#nextTab > span').style.opacity = "";
		document.querySelector('#nextTab > span').style.pointerEvents = "";
	}
	if (panelOn == 3) { // login screen
		document.querySelector('#nextTab > span').style.opacity = "0";
		document.querySelector('#nextTab > span').style.pointerEvents = "none";
		document.querySelector('#prevTab > span').style.opacity = "0";
		document.querySelector('#prevTab > span').style.pointerEvents = "none";
	}
}

function pause_audio () {
    background.mp3Player.pause();
    $("#pauseButton").hide();
    $("#playButton").show();
}

function play_audio () {
    background.play(localStorage.lastStation);
    $("#playButton").hide();
}

background.setCallbacks(updatePlayer, drawPlayer, downloadSong);
