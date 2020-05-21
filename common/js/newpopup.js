/*globals $, get_browser, default_width, default_height*/

//https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript#answer-10074204
function zeroPad(num, places) {
    "use strict";
    if (num.toString().length >= places) {
        return num;
    }
    return String(Math.pow(10, places) + Math.floor(num)).substring(1);
}

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

const panels = ["historyPanel", "leftPanel", "midPanel", "rightPanel"]; // panel IDs
const panelHolder = document.getElementById('anesidora');
var tabsInit = false; // see goToPanel
var panelOn = 0;

function goToPanel(which) {
    "use strict";
    if (!tabsInit) return; // don't do anything if it's not been initialized yet
    if (which == 0) {
        updateHistory(); // if it's the history panel, update the history
    }
    panelOn = which;
    for (let i = 0; i < panels.length; i++) {
        document.getElementById(panels[i]).style.left = "calc(var(--width) * "+(i-which)+")";
    }
    handleSwitch();
}

function initTabs() {
    "use strict";
    for (let i = 0; i < panels.length; i++) {
        document.getElementById(panels[i]).style.left = "calc(var(--width) * "+i+")"; 
    }
    tabsInit = true;
}


// I don't need to include these functions, but hey, it's used somewhere in the code so might as well keep it
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
    const historyDiv = document.getElementById("historyDiv");
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
    const historyDiv = document.getElementById("historyDiv");
    background.prevSongs.reverse().forEach(function (song, i) {
        /*
         * Generate history item.
         * Structure:
         * .historyItem
         * ┠ .holder
         * ┃ ┠ .cover
         * ┃ ┃ ╰ span
         * ┃ ╰ .overlay
         * ┃   ╰ .actions
         * ┃     ┠ likeAction
         * ┃     ┃ ╰ span
         * ┃     ┠ downloadAction
         * ┃     ┃ ╰ span
         * ┃     ╰ dislikeAction
         * ┃       ╰ span
         * ╰ span (nameSpan)
         */
        let elem = document.createElement('div');
        elem.classList.add('historyItem');
        let cover = document.createElement('div');
        cover.classList.add('historyCover');
        cover.classList.add('icon');
        let overlay = document.createElement('div');
        overlay.classList.add('historyOverlay');
        let holder = document.createElement('div');
        holder.classList.add('holder');
        let actions = document.createElement('div');
        actions.classList.add('actions');

        // All of what used to be imgs have to now be divs holding spans in order to be themable.
        
        let likeAction = document.createElement('div');
        likeAction.classList.add('hoverImg');
        likeAction.classList.add('icon');
        let downloadAction = document.createElement('div');
        downloadAction.classList.add('download');
        downloadAction.classList.add('hoverImg');
        downloadAction.classList.add('icon');
        let dislikeAction = document.createElement('div');
        dislikeAction.classList.add('hoverImg');
        dislikeAction.classList.add('icon');
        let nameSpan = document.createElement('span');
        
        historyDiv.appendChild(elem);
        elem.appendChild(holder);
        if (song.albumArtUrl) {
            cover.style.background = `url("${song.albumArtUrl}")`;
        } else {
            cover.style.background = "";
            cover.appendChild(document.createElement("span"));
        }
        holder.appendChild(cover);
        holder.appendChild(overlay);
        overlay.appendChild(actions);
        actions.appendChild(likeAction);
        likeAction.appendChild(document.createElement('span')); // we'll never interact with this span again, so why keep a reference?

        let likeStatus = "like";
        if (song.songRating == -1) {
            likeStatus = "disliked";
        } else if (song.songRating == 0) {
            likeStatus = "like";
        } else if (song.songRating == 1) {
            likeStatus = "liked";
        }
        likeAction.classList.add((likeStatus=="liked"?"liked":"like")); 
      // inline if statement: (statement?(statment is true):(statement is false))

        actions.appendChild(downloadAction);
        downloadAction.appendChild(document.createElement("span"));
        actions.appendChild(dislikeAction);
        dislikeAction.appendChild(document.createElement('span'));
        dislikeAction.classList.add((likeStatus=="disliked"?"disliked":"dislike"));
        elem.appendChild(nameSpan);
        nameSpan.innerText = song.songName;
        let historyNum = i,
            thisSong = song;
        cover.addEventListener('click', () => {
            get_browser().tabs.create({
                'url': thisSong.songDetailUrl // I'm not sure why you can't just make an anchor tag but sure, whatever
            });
        });

        likeAction.addEventListener("click", (e) => {
            if (likeStatus == "liked") {
                return;
            }
            background.addFeedback(historyNum, 1);
            // remember, all icons are now based upon their class - see newpopup.css:588 - newpopup.css:646
            likeAction.classList.add('liked');
            likeAction.classList.remove('like'); // classList.remove is safe in that if it doesn't already have that class, it won't throw an error when trying to remove something that doesn't exist.
            dislikeAction.classList.add('dislike');
            dislikeAction.classList.remove('disliked');
            likeStatus = "liked";
            e.preventDefault(e);
        });

        downloadAction.addEventListener("click", (e) => {
            downloadSong(song.audioUrlMap.highQuality.audioUrl, song.songName);
            e.preventDefault(e);
        });

        dislikeAction.addEventListener("click", (e) => {
            if (likeStatus == "disliked") {
                return;
            }
            background.addFeedback(historyNum, -1);
            likeAction.classList.remove("liked");
            likeAction.classList.add("like");
            dislikeAction.classList.remove("dislike");
            dislikeAction.classList.add("disliked");
            likeStatus = "disliked";
            e.preventDefault(e);
        });
    });
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
        stationCallbacks[i](); // run each station callback, defined at newpopup.js:279
    }
}

function addStations() {
    "use strict";
    let filter = document.getElementById("stationFilterInput").value;

    background.stationList.sort((a, b) => {
        return a.stationName.localeCompare(b.stationName) // sort alphabetically
    });
    stationCallbacks = [];
    background.stationList.filter((station) => { 
        // if there's something in the searchbar, filter out everything that doesn't include it.
        // array.filter returns another array with every item that evaluates to 'true' in this function
        if (!filter) { // if not searching, everything is fine
            return true;
        }
        return station.stationName.toLowerCase().includes(filter.toLowerCase());
    }).forEach(function (station) { // for each filtered station, run function
        if (!background.stationImgs[station.stationId]) {
            background.stationImgs[station.stationId] = "/images/new/default_album.svg";
        }
        /*
         * Generate station.
         * Uses a lot of the same classes as history items, because they're pretty much the same thing.
         * Structure:
         * .historyItem
         * ┠ .holder
         * ┃ ┠ .cover
         * ┃ ┃ ╰ span
         * ┃ ╰ .overlay
         * ┃   ╰ .actions
         * ┃     ╰ .stationPlay
         * ┃       ╰ span
         * ╰ span (statonName)
         */
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
        let playAction = document.createElement('div');
        playAction.classList.add('hoverImg');
        playAction.classList.add('stationPlay');
        playAction.classList.add('icon');
        let nameSpan = document.createElement('span');
        
        document.getElementById("stationListDiv").appendChild(elem);
        elem.appendChild(holder);
        cover.style.background = `url("${background.stationImgs[station.stationId]}")`;
        holder.appendChild(cover);
        if (background.stationImgs[station.stationId] == "/images/new/default_album.svg") {
            cover.classList.add("icon");
            cover.appendChild(document.createElement("span"));
            cover.style.background = "";
        }
        holder.appendChild(overlay);
        overlay.appendChild(actions);
        actions.appendChild(playAction);
        playAction.appendChild(document.createElement("span"));
        elem.appendChild(nameSpan);

        nameSpan.textContent = station.stationName;
        let thisStation = station;

        if (station.stationDetailUrl != "") {
            cover.addEventListener("click", () => {
                get_browser().tabs.create({
                    "url": station.stationDetailUrl
                });
            });
        }

        playAction.addEventListener("click", () => {
            background.nextSongStation(thisStation.stationToken);
            elem.classList.add("activeStation");
            if (lastActiveStation) {
                lastActiveStation.classList.remove("activeStation");
            }
            lastActiveStation = elem;

            // This is due to a bug where switching stations doesn"t start the correct next song...
            //yee haw lazy fixes!
            // background.nextSong();
            goToPanel(1);
            handleSwitch();
        });

        //place station images or default image
        // if default, theme it with `icon`
        stationCallbacks.push(() => {
            if (background.stationImgs[station.stationId] == "/images/new/default_album.svg") {
                cover.classList.add("icon");
                cover.style.background = "";
            } else {
                cover.classList.remove("icon");
                cover.style.background = `url("${background.stationImgs[thisStation.stationId]}")`;
            }
        });
    });
}
var lastActiveStation = "";

function updatePlayer() {
    "use strict";
    if (background.currentSong) {
        $("#coverArt").unbind().bind("click", function () {
            get_browser().tabs.create({
                "url": background.currentSong.albumDetailUrl
            });
        });
        if (background.currentSong.albumArtUrl != "") {
            document.getElementById("coverArt").style.backgroundImage = "url(\""+background.currentSong.albumArtUrl+"\")";
        } else {
            document.getElementById("coverArt").style.background = "";
        }
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
            $("#tUpButton").unbind("click");
            document.getElementById("tUpButton").classList.add("liked");
            document.getElementById("tUpButton").classList.remove("like");
        } else {
            document.getElementById("tUpButton").classList.add("like");
            document.getElementById("tUpButton").classList.remove("liked");
            $("#tUpButton").click(function () {
                background.addFeedback(-1, true);
                document.getElementById("tUpButton").classList.add("liked");
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

function drawPlayer() { // Update scrubber.
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

document.documentElement.style.setProperty("--height", localStorage.bodyHeight +"px");
document.documentElement.style.setProperty("--width", localStorage.bodyWidth+"px");
if (localStorage.themeInfo && localStorage.themeInfo !== "") {
    for (let key in JSON.parse(localStorage.themeInfo)) {
        document.documentElement.style.setProperty("--" + key, JSON.parse(localStorage.themeInfo)[key]);
    }
}

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
    // _So much_ CSS depends on those variables being set.
    
    
    
//    var scrollerWidth = $("body").width() * 0.6;
//    $(".scrollerContainer").width(scrollerWidth

    initTabs();

    if (background.mp3Player.paused) {
        $("pauseButton").hide();
        $("playButton").show();
    } else {
        $("pauseButton").show();
        $("playButton").hide();
    }

    $("#volume").slider({ // Volume slider.
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

    $("#scrubber").slider({
        // Seek function. Also cleverly uses whitespace to hide cryptominers.
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
            $("#tUpButton").unbind("click").attr("src", "images/new/liked.svg");
        }
    });
    $("#tDownButton").bind("click", function () {
        background.addFeedback(-1, false);
        setTimeout(function () {
            background.nextSong();
        }, 1000); // Small delay to stop extension from freezing for some reason
        // To whoever commented above: It's probably a race condition with network requests.
        // Maybe set it to skip once the dislike request has finished in background.js?
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

    $("#unWarning").hide();
    $("#pwWarning").hide();
    $("#login").bind("submit", function () {
        localStorage.username = $("#username").val();
        localStorage.password = $("#password").val();
        background.partnerLogin();
        if (background.userAuthToken === "") {
            document.getElementById("li1").classList.add("warning");
            document.getElementById("li2").classList.add("warning");
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
        // ooo animation
        if (!lockRotate) { // don't try to animate this while it's still animating
            document.getElementById('stationRefreshButton').style.animation = "rotate 500ms ease-in-out";

            lockRotate = true;
        }
        refreshStations();
        setTimeout(() => {
            lockRotate = false; // animation done; can start another
        }, 500);
    });

    // document.getElementById("stationFilterInput").addEventListener("keypress", () => {
    //     refreshStationList();
    // });

    if (background.stationList !== undefined) {
        addStations();
    }
    // Check for a need to relogin.
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

    // Scrolls text using computed styles.
    const scrollerText = document.getElementsByClassName('scrollerText')[0];
    scrollerText.addEventListener('mouseover', () => {
        if ($('.scrollerText').width() - $('#nowPlayingContainerCell').width() > 0) {

            $(".scrollerText").css({
                transition: "left "+ (($(".scrollerText").width() - $("#nowPlayingContainerCell").width())*30) + "ms linear",
                left: $("#nowPlayingContainerCell").width() - $(".scrollerText").width()
            });
        } else {
            $(".scrollerText").css({
                left: "0px"
            });
        }
    });
    scrollerText.addEventListener('mouseleave', () => {
        //move it to left """immediately"""
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
    document.querySelector("#prevTab > span").addEventListener("click", () => {
        if (panelOn > 0) {
            goToPanel(panelOn-1);
        }
    });
    document.querySelector("#nextTab > span").addEventListener("click", () => {
        if (panelOn < 2) {
            goToPanel(panelOn+1);
        }
    });
    updateHistory();
});

function handleSwitch() {
    // in a nutshell: make it so you can't go out of bounds with the tab buttons
    if (panelOn <= 0) {
        document.querySelector("#prevTab > span").style.opacity = "0";
        document.querySelector("#prevTab > span").style.pointerEvents = "none";
    } else {
        document.querySelector("#prevTab > span").style.opacity = "";
        document.querySelector("#prevTab > span").style.pointerEvents = "";
    }
    if (panelOn >= 2) {
        document.querySelector("#nextTab > span").style.opacity = "0";
        document.querySelector("#nextTab > span").style.pointerEvents = "none";
    } else {
        document.querySelector("#nextTab > span").style.opacity = "";
        document.querySelector("#nextTab > span").style.pointerEvents = "";
    }
    if (panelOn == 3) { // login screen
        document.querySelector("#nextTab > span").style.opacity = "0";
        document.querySelector("#nextTab > span").style.pointerEvents = "none";
        document.querySelector("#prevTab > span").style.opacity = "0";
        document.querySelector("#prevTab > span").style.pointerEvents = "none";
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
