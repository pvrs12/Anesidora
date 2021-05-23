"use strict"
/*globals $, get_browser, default_width, default_height*/

//https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript#answer-10074204
function zeroPad(num, places) {
    if (num.toString().length >= places) {
        return num;
    }
    return String(Math.pow(10, places) + Math.floor(num)).substring(1);
}
function gCS(item) {
    return getComputedStyle(item);
}
function subN(str) {
    return parseInt(str.substring(0, str.length-2));
}
function wipeTrackers(str) {
    return str.split('?')[0];
}

var background = get_browser().extension.getBackgroundPage();


const panels = ["historyPanel", "leftPanel", "midPanel", "rightPanel"];
var tabsInit = false;
var panelOn = 0;

const gEID = document.getElementById.bind(document);
const qS = document.querySelector.bind(document);

let pauseButton = gEID('pauseButton'),
    playButton = gEID('playButton'),
    scrollerText = qS('.scrollerText'),
    nowPlayingContainerCell = gEID('nowPlayingContainerCell'),
    prevTS = qS('#prevTab > span'),
    nextTS = qS('#nextTab > span'),
    downloadButton = gEID('downloadButton'),
    artistLink = gEID('artistLink'),
    stationRefreshButton = gEID('stationRefreshButton'),
    skipButton = gEID('skipButton'),
    tUpButton = gEID('tUpButton'),
    tDownButton = gEID('tDownButton'),
    stationFilterInput = gEID('stationFilterInput'),
    unInput = gEID('username'),
    pwInput = gEID('password'),
    unWarning = gEID('unWarning'),
    pwWarning = gEID('pwWarning'),
    sleepButton = gEID('sleepButton'),
    scrubber = gEID('scrubber'),
    volume = gEID('volume'),
    coverArt = gEID('coverArt'),
    login = gEID('login'),
    scrubShow = gEID('scrubShow'),
    volShow = gEID('volShow');
    

function goToPanel(which) {
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
    for (let i = 0; i < panels.length; i++) {
        document.getElementById(panels[i]).style.left = "calc(var(--width) * "+i+")";
    }
    tabsInit = true;
}

function goToLogin() {
    goToPanel(3);
}

function goToStations() {
    goToPanel(2);
}

function goToPlayer() {
    goToPanel(1);
}

function clearHistory() {
    const historyDiv = document.getElementById("historyDiv");
    while (historyDiv.hasChildNodes()) {
        historyDiv.removeChild(historyDiv.firstChild);
    }
}

function downloadSong(url, title) {
    //making an anchor tag and clicking it allows the download dialog to work and save the file with the song"s name

    //trim the title of the song to 15 characters... not a perfect solution, but there were issues with it at full length
    title = title.substring(0, 15);
    let a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/ /g, '_')}.mp4`
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateHistory() {
    clearHistory();
    const historyDiv = document.getElementById("historyDiv");
    background.prevSongs.reverse().forEach(function (song, i) {
        let historyElem = document.createElement("div");
        historyElem.classList.add("historyItem");
        let cover = document.createElement("a");
        cover.href = song.songDetailUrl;
        cover.classList.add("historyCover");
        cover.classList.add("icon");
        let overlay = document.createElement("div");
        overlay.classList.add("historyOverlay");
        let holder = document.createElement("div");
        holder.classList.add("holder");
        let actions = document.createElement("div");
        actions.classList.add("actions");
        let likeAction = document.createElement("div");
        likeAction.classList.add("hoverImg", "icon", "bx", "bx-like");
        let downloadAction = document.createElement("a");
        downloadAction.classList.add("bx-download", "hoverImg", "icon", "bx");
        downloadAction.href  = song.audioUrlMap.highQuality.audioUrl;
        downloadAction.download = `${song.songName.replace(/ /g, '_')}.mp4`;

        let dislikeAction = document.createElement("div");
        dislikeAction.classList.add("hoverImg", "icon", "bx", "bx-dislike");
        let nameSpan = document.createElement("span");

        historyDiv.appendChild(historyElem);
        historyElem.appendChild(holder);
        if (song.albumArtUrl && song.albumArtUrl !== '') {
            cover.style.background = `url("${song.albumArtUrl}")`;
        } else {
            cover.style.background = "";
            let icon = document.createElement('i');
            icon.classList.add('bx', 'bx-album');
            cover.appendChild(icon);
        }
        holder.appendChild(cover);
        holder.appendChild(overlay);
        overlay.appendChild(actions);
        actions.appendChild(likeAction);

        let likeStatus = "unrated";
        if (song.songRating === -1) {
            likeStatus = "disliked";
        } else if (song.songRating === 0) {
            likeStatus = "unrated";
        } else if (song.songRating === 1) {
            likeStatus = "liked";
        }
        likeAction.classList.add((likeStatus == "liked" ? "bxs-like" : "bx-like"));
        actions.appendChild(downloadAction);
        actions.appendChild(dislikeAction);
        dislikeAction.classList.add((likeStatus == "disliked" ? "bxs-dislike" : "bx-dislike"));
        historyElem.appendChild(nameSpan);
        nameSpan.textContent = song.songName;

        let historyNum = i;

        likeAction.addEventListener("click", (e) => {
            if (likeStatus == "liked") {
                return;
            }
            background.addFeedback(historyNum, true);
            likeAction.classList.add("bxs-like");
            likeAction.classList.remove("bx-like");
            dislikeAction.classList.add("bx-dislike");
            dislikeAction.classList.remove("bxs-disliked");
            likeStatus = "liked";
            e.preventDefault(e);
        });

        dislikeAction.addEventListener("click", (e) => {
            if (likeStatus == "disliked") {
                return;
            }
            background.addFeedback(historyNum, false);
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
    let list = document.getElementById("stationListDiv");
    while(list.lastChild) {
        list.removeChild(list.lastChild);
    }
    addStations();
}

async function refreshStations() {
    await background.getStationList(refreshStationList);
}
var stationCallbacks = [];

function updateStationCovers() {
    for (let i = 0; i < stationCallbacks.length; i++) {
        stationCallbacks[i]();
    }
}

function addStations() {
    let filter = stationFilterInput.value;

    background.stationList.sort((a, b) => {
        return a.stationName.localeCompare(b.stationName);
    });
    stationCallbacks = [];
    background.stationList.filter((station) => {
        if (!filter) {
            return true;
        }
        return station.stationName.toLowerCase().includes(filter.toLowerCase());
    }).forEach(function (station) {
        let stationElem = document.createElement("div");
        stationElem.classList.add("historyItem");
        let cover = document.createElement("div");
        cover.classList.add("historyCover");
        let overlay = document.createElement("div");
        overlay.classList.add("historyOverlay");
        let holder = document.createElement("div");
        holder.classList.add("holder");
        let actions = document.createElement("div");
        actions.classList.add("actions");
        let playAction = document.createElement("div");
        playAction.classList.add("hoverImg", "stationPlay", "icon");
        let nameSpan = document.createElement("span");
        
        document.getElementById("stationListDiv").appendChild(stationElem);
        stationElem.appendChild(holder);
        if (!background.stationImgs[station.stationId]) {
            cover.classList.add("icon");
            let icon = document.createElement('i');
            icon.classList.add('bx', 'bx-album', 'stationIcon');
            cover.appendChild(icon);
            cover.style.background = "";
        } else {
	    cover.classList.remove("icon");
	    cover.children[0] && cover.children[0].classList.remove('bx', 'bx-album', 'stationIcon');
	    cover.style.background = "url('"+background.stationImgs[station.stationId]+"')";
	}
        holder.appendChild(overlay);
	holder.appendChild(cover);
        overlay.appendChild(actions);
        actions.appendChild(playAction);
	playAction.classList.add('bx', 'bx-play');
        stationElem.appendChild(nameSpan);

        nameSpan.textContent = station.stationName;
        let thisStation = station;

        const start_station = () => {
            background.nextSongStation(thisStation.stationToken);
            stationElem.classList.add("activeStation");
            if (lastActiveStation) {
                lastActiveStation.classList.remove("activeStation");
            }
            lastActiveStation = stationElem;

            goToPanel(1);
            handleSwitch();
        }

        //this used to open the "station detail URL". that never seemed to work
        //and was confusing since it was expected to play the station.
        cover.addEventListener("click", start_station);
        playAction.addEventListener("click", start_station);

        //place station images or default image
        // if default, theme it with `icon`
        stationCallbacks.push(() => {
            if (!background.stationImgs[station.stationId]) {
                cover.style.background = "";
                cover.children[0].classList.add('bx', 'bx-album');
            } else {
                cover.classList.remove("icon");
                cover.children[0] && cover.children[0].classList.remove('bx', 'bx-album');
                cover.style.background = `url("${background.stationImgs[thisStation.stationId]}")`;
            }
        });
    });
}
var lastActiveStation = "";

function updatePlayer() {
    if (background.currentSong) {
        coverArt.href = background.currentSong.albumDetailUrl;
        if (background.currentSong.albumArtUrl != "") {
            coverArt.style.backgroundImage = "url(\""+background.currentSong.albumArtUrl+"\")";
            coverArt.children[0] && (coverArt.children[0].style.display = "none");
        } else {
            coverArt.style.background = "";
            coverArt.children[0] && (coverArt.children[0].style.display = "inline-block");
        }

        gEID('dash').innerText = ' - ';


        titleLink.href = wipeTrackers(background.currentSong.songDetailUrl);
        titleLink.innerText = background.currentSong.songName;
        
        artistLink.href = wipeTrackers(background.currentSong.artistDetailUrl);
        artistLink.innerText = background.currentSong.artistName;

        downloadButton.href = background.currentSong.audioUrlMap.highQuality.audioUrl;
        downloadButton.download = background.currentSong.songName.replace(/ /g, '_') + '.mp4';

        if (background.currentSong.songRating === 1) {
            tUpButton.children[0] && tUpButton.children[0].classList.add("bxs-like");
            tUpButton.children[0] && tUpButton.children[0].classList.remove("bx-like");
        } else {
            tUpButton.children[0] && tUpButton.children[0].classList.add("bx-like");
            tUpButton.children[0] && tUpButton.children[0].classList.remove("bxs-like");
        }
        tDownButton.children[0] && tUpButton.children[0].classList.remove('bxs-dislike');
        tDownButton.children[0] && tUpButton.children[0].classList.add('bx-like');
    }

    if (background.mp3Player.paused) {
            playButton.style.display = '';
            pauseButton.style.display = 'none';
    } else {
            playButton.style.display = 'none';
            pauseButton.style.display = '';
    }

    
    scrubber.value = 0;
    
    scrubShow.style.width = '0%';
    updateStationCovers();
}

function drawPlayer() {
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

    scrubber.setAttribute('title', `${curMinutes}:${curSeconds}/${totalMinutes}:${totalSeconds}`);
    scrubber.value = (background.mp3Player.currentTime / background.mp3Player.duration) * 100;
    
    scrubShow.style.width = (background.mp3Player.currentTime / background.mp3Player.duration) * 100 + '%';
}

document.documentElement.style.setProperty("--height", localStorage.bodyHeight +"px");
document.documentElement.style.setProperty("--width", localStorage.bodyWidth+"px");
if (localStorage.themeInfo && localStorage.themeInfo !== "") {
    for (let key in JSON.parse(localStorage.themeInfo)) {
        document.documentElement.style.setProperty("--" + key, JSON.parse(localStorage.themeInfo)[key]);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    pauseButton = gEID('pauseButton');
    playButton = gEID('playButton');
    scrollerText = qS('.scrollerText');
    nowPlayingContainerCell = gEID('nowPlayingContainerCell');
    prevTS = qS('#prevTab > span');
    nextTS = qS('#nextTab > span');
    downloadButton = gEID('downloadButton');
    artistLink = gEID('artistLink');
    stationRefreshButton = gEID('stationRefreshButton');
    skipButton = gEID('skipButton');
    tUpButton = gEID('tUpButton');
    tDownButton = gEID('tDownButton');
    stationFilterInput = gEID('stationFilterInput');
    unInput = gEID('username');
    pwInput = gEID('password');
    unWarning = gEID('unWarning');
    pwWarning = gEID('pwWarning');
    sleepButton = gEID('sleepButton');
    scrubber = gEID('scrubber');
    volume = gEID('volume');
    coverArt = gEID('coverArt');
    login = gEID('login');
    scrubShow = gEID('scrubShow');
    volShow = gEID('volShow');

    document.documentElement.style.setProperty("--height", localStorage.bodyHeight +"px");
    document.documentElement.style.setProperty("--width", localStorage.bodyWidth + "px");

    initTabs();

    if (background.mp3Player.paused) {
        playButton.style.display = '';
        pauseButton.style.display = 'none';
    } else {
        playButton.style.display = 'none';
        pauseButton.style.display = '';
    }

    volume.value = (localStorage.volume ? localStorage.volume * 100 : 20);
    volShow.style.width = (localStorage.volume ? localStorage.volume * 100 : 20) + '%';
    
    volume.addEventListener('input', (e) => {
        background.mp3Player.volume = e.target.value / 100;
        localStorage.volume = e.target.value / 100;
        volShow.style.width = e.target.value + '%';
    })

    scrubber.addEventListener('input', (e) => {
        background.mp3Player.currentTime = background.mp3Player.duration * (e.target.value / 100);
        scrubShow.style.width = e.target.value + '%';
    })

    playButton.addEventListener('click', play_audio);
    pauseButton.addEventListener('click', pause_audio);

    skipButton.addEventListener("click", () => {
        scrubber.value = 0;
        scrubShow.style.width = '0%';
        background.nextSong()
    });
    tUpButton.addEventListener("click", function () {
        if (background.currentSong.songRating !== 1) {
            background.addFeedback(-1, true);
        }
    });
    tDownButton.addEventListener("click", async function () {
        await background.addFeedback(-1, false);
        background.nextSong();
    });
    sleepButton.addEventListener("click", async function () {
        await background.sleepSong();
        background.nextSong();
    });


    unWarning.style.display = 'none';
    pwWarning.style.display = 'none';

    login.addEventListener("submit", async function () {
        localStorage.username = unInput.value;
        localStorage.password = pwInput.value;
        await background.partnerLogin();
        if (background.userAuthToken === "") {
            document.getElementById("li1").classList.add("warning");
            document.getElementById("li2").classList.add("warning");
            return false;
        } else {
            await addStations();
            //move to mid panel
            goToStations();
            return false;
        }
    });

    ['keypress', 'change', 'input', 'paste'].forEach(e => {
        stationFilterInput.addEventListener(e, refreshStationList)
    })
    stationRefreshButton.addEventListener("click", async () => {
        stationRefreshButton.children[0].classList.add('bx-spin');
        await refreshStations();
        stationRefreshButton.children[0].classList.remove('bx-spin');
    });

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

    scrollerText.addEventListener("mouseover", () => {
        if (subN(gCS(scrollerText).width) - subN(gCS(nowPlayingContainerCell).width) > 0) {
            scrollerText.style.transition = `left ${(subN(gCS(scrollerText).width) - subN(gCS(nowPlayingContainerCell).width))*30}ms linear`,
            scrollerText.style.left =  `${subN(gCS(nowPlayingContainerCell).width) - subN(gCS(scrollerText).width)}px`
        } else {
            scrollerText.style.left = 0;
        }
    });
    scrollerText.addEventListener("mouseleave", () => {
        //move it to left immediately
        scrollerText.style.left = 0;
    });

    if (background.mp3Player.src !== "") {
        downloadButton.src = background.mp3Player.src;
        if (background.mp3Player.currentTime > 0) {
            updatePlayer();
            drawPlayer();
        }
    } else {
        updatePlayer();
    }
    handleSwitch();
    prevTS.addEventListener("click", () => {
        if (panelOn > 0) {
            goToPanel(panelOn-1);
        }
        handleSwitch();
    });
    nextTS.addEventListener("click", () => {
        if (panelOn < 2) {
            goToPanel(panelOn+1);
        }
        handleSwitch();
    });
    updateHistory();
});

function handleSwitch() {
    if (panelOn <= 0) {
        prevTS.style.opacity = "0";
        prevTS.style.pointerEvents = "none";
    } else {
        prevTS.style.opacity = "";
        prevTS.style.pointerEvents = "";
    }
    if (panelOn >= 2) {
        nextTS.style.opacity = "0";
        nextTS.style.pointerEvents = "none";
    } else {
        nextTS.style.opacity = "";
        nextTS.style.pointerEvents = "";
    }
    if (panelOn == 3) { // login screen
        nextTS.style.opacity = "0";
        nextTS.style.pointerEvents = "none";
        prevTS.style.opacity = "0";
        prevTS.style.pointerEvents = "none";
    }
}

function pause_audio () {
    background.mp3Player.pause();
    pauseButton.style.display = "none";
    playButton.style.dksplay = "block";
}

function play_audio () {
    background.play(localStorage.lastStation);
    pauseButton.style.display = "block";
    playButton.style.display = "none";
}

background.setCallbacks(updatePlayer, drawPlayer, downloadSong);

if (localStorage.username && localStorage.password && !background.userAuthToken) {
    background.partnerLogin();
}