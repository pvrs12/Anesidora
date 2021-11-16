/*globals get_browser */

const SMOOTH_SCROLL_TIME = 1000;
// No real downside to getting it too high.

//https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript#answer-10074204
function zeroPad(num) {
    return "0".repeat(Math.max(0, 2 - ((Math.floor(num) + "").length))) + Math.floor(num);
}
function wipeTrackers(str) {
    return str.split("?")[0];
}

var background = get_browser().extension.getBackgroundPage();


var panelOn = 0;
/** @type {typeof document['getElementById']} */
const gEID = document.getElementById.bind(document);

let pauseButton = gEID("pauseButton"),
    playButton = gEID("playButton"),
    prevTS = gEID("prevTab") && gEID("prevTab").children[0],
    nextTS = gEID("nextTab") && gEID("prevTab").children[0],
    downloadButton = gEID("downloadButton"),
    artistLink = gEID("artistLink"),
    stationRefreshButton = gEID("stationRefreshButton"),
    skipButton = gEID("skipButton"),
    tUpButton = gEID("tUpButton"),
    tDownButton = gEID("tDownButton"),
    stationFilterInput = gEID("stationFilterInput"),
    unInput = gEID("username"),
    pwInput = gEID("password"),
    unWarning = gEID("unWarning"),
    pwWarning = gEID("pwWarning"),
    sleepButton = gEID("sleepButton"),
    scrubber = gEID("scrubber"),
    volume = gEID("volume"),
    login = gEID("login"),
    scrubShow = gEID("scrubShow"),
    volShow = gEID("volShow"),
    covers = gEID("covers"),
    back = gEID("back");
    

function goToPanel(which) {
    if (which == 0) {
        updateHistory();
    }
    localStorage.tabOn = which;
    panelOn = which;
    [...gEID("panels").children].forEach(e => {
        e.setAttribute("tabindex", "-1");
    });
    gEID("panels").style.transform = `translateX(${-100 * panelOn}vw)`;
    gEID("panels").children[panelOn].removeAttribute("tabindex");
}

function initTabs() {
    if (localStorage.tabOn) {
        panelOn = parseInt(localStorage.tabOn);
        [...gEID("panels").children].forEach((e, i) => {
            if (i !== panelOn) {
                e.setAttribute("tabindex", "-1");
            }
        });
        gEID("panels").children[panelOn].removeAttribute("tabindex");
        gEID("panels").style.transform = `translateX(${-100 * panelOn}vw)`;
    }
}

function clearHistory() {
    const historyDiv = document.getElementById("historyPanel");
    while (historyDiv.hasChildNodes()) {
        historyDiv.removeChild(historyDiv.firstChild);
    }
}

function downloadSong(url, title) {
    //making an anchor tag and clicking it allows the download dialog to work and save the file with the song"s name

    //trim the title of the song to 15 characters... not a perfect solution, but there were issues with it at full length
    title = title.substring(0, 15);
    let a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/ /g, "_")}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateHistory() {
    clearHistory();
    const historyDiv = document.getElementById("historyPanel");
    // do not sort in place
    [...background.prevSongs].reverse().forEach(function (song, i) {
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
        downloadAction.download = `${song.songName.replace(/ /g, "_")}.mp4`;

        let dislikeAction = document.createElement("div");
        dislikeAction.classList.add("hoverImg", "icon", "bx", "bx-dislike");
        let nameSpan = document.createElement("span");

        historyDiv.appendChild(historyElem);
        historyElem.appendChild(holder);
        if (song.albumArtUrl && song.albumArtUrl !== "") {
            cover.style.background = `url("${song.albumArtUrl}")`;
        } else {
            cover.style.background = "";
            let icon = document.createElement("i");
            icon.classList.add("bx", "bx-album");
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
            let icon = document.createElement("i");
            icon.classList.add("bx", "bx-album", "stationIcon");
            cover.appendChild(icon);
            cover.style.background = "";
        } else {
            cover.classList.remove("icon");
            cover.children[0] && cover.children[0].classList.remove("bx", "bx-album", "stationIcon");
            cover.style.background = "url('"+background.stationImgs[station.stationId]+"')";
        }
        holder.appendChild(overlay);
        holder.appendChild(cover);
        overlay.appendChild(actions);
        actions.appendChild(playAction);
        playAction.classList.add("bx", "bx-play");
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
        };

        //this used to open the "station detail URL". that never seemed to work
        //and was confusing since it was expected to play the station.
        cover.addEventListener("click", start_station);
        playAction.addEventListener("click", start_station);

        //place station images or default image
        // if default, theme it with `icon`
        stationCallbacks.push(() => {
            if (!background.stationImgs[station.stationId]) {
                cover.style.background = "";
                cover.children[0].classList.add("bx", "bx-album");
            } else {
                cover.classList.remove("icon");
                cover.children[0] && cover.children[0].classList.remove("bx", "bx-album");
                cover.style.background = `url("${background.stationImgs[thisStation.stationId]}")`;
            }
        });
    });
}
var lastActiveStation = "";

function adaptSchema(song) {
    return {
        authorName: song.artistName,
        authorLink: wipeTrackers(song.artistDetailUrl),
        albumLink: wipeTrackers(song.albumDetailUrl),
        albumTitle: song.albumName,
        downloadLink: song.audioUrlMap.highQuality.audioUrl,
        likeStatus: song.songRating,
        songLink: wipeTrackers(song.songDetailUrl),
        songTitle: song.songName,
        coverSrc: song.albumArtUrl,
        trackToken: song.trackToken
    };
}

let tryingToPlay = false;

/**
 * @returns {HTMLDivElement}
 * @param where {number} Position of cover. - left of center, 0 center, + right of center.
 * @param info {{trackToken: string, authorName: string, authorLink: string, songTitle: string, songLink: string, albumTitle: string, albumLink: string, downloadLink: string, likeStatus: number, coverSrc?: string}}
 * @description
 * Creates cover structure for centerfold and returns it. 
 */
function generateCover(where, info) {
    /**
     * Cover structure:
     * 
     * <div.{current?}>
     *   <div.info>
     *     <button.remove><i.bx.bx-x /></button.remove>
     *     <span.position>Coming in 5 songs | 5 songs ago</span.position>
     *     <span.author>Author Name</span.author>
     *     <span.songTitle>Song Title</span.songTitle>
     *     <span.albumTitle>Album Title</span.albumTitle>
     *     <div.coverActions>
     *       <button><i.bx.bx{s?}-like /></button>
     *       <a><i.bx.bx{s?}-download /></a>
     *       <button><i.bx.bx{s?}-dislike /></button>
     *       <button><i.bx.bx-play /></button>
     *     </div.coverActions>
     *   </div.info>
     *   <img.actualCover />
     * </div>
     * 
     **/
    /* This is quite possibly the worst I could've organized my variables but I thought it was funny */
    const tree = {
        r: document.createElement("div"),
        info: {
            r: document.createElement("div"),
            remove: document.createElement("button"),
            position: document.createElement("span"),
            author: document.createElement("a"),
            songTitle: document.createElement("a"),
            albumTitle: document.createElement("a"),
            coverActions: {
                r: document.createElement("div"),
                like: {
                    r: document.createElement("button"),
                    i: document.createElement("i")
                },
                download: {
                    r: document.createElement("a"),
                    i: document.createElement("i")
                },
                dislike: {
                    r: document.createElement("button"),
                    i: document.createElement("i")
                },
                play: {
                    r: document.createElement("button"),
                    i: document.createElement("i")
                }
            }
        },
        actualCover: document.createElement("img")
    };
    tree.r.setAttribute("data-where", where);

    tree.r.appendChild(tree.info.r);
    tree.info.r.appendChild(tree.info.remove);
    tree.info.r.appendChild(tree.info.position);
    tree.info.r.appendChild(tree.info.position);
    tree.info.r.appendChild(tree.info.author);
    tree.info.r.appendChild(tree.info.songTitle);
    tree.info.r.appendChild(tree.info.albumTitle);
    tree.info.r.appendChild(tree.info.coverActions.r);
    tree.info.coverActions.r.appendChild(tree.info.coverActions.like.r);
    tree.info.coverActions.like.r.appendChild(tree.info.coverActions.like.i);
    tree.info.coverActions.r.appendChild(tree.info.coverActions.download.r);
    tree.info.coverActions.download.r.appendChild(tree.info.coverActions.download.i);
    tree.info.coverActions.r.appendChild(tree.info.coverActions.dislike.r);
    tree.info.coverActions.dislike.r.appendChild(tree.info.coverActions.dislike.i);
    tree.info.coverActions.r.appendChild(tree.info.coverActions.play.r);
    tree.info.coverActions.play.r.appendChild(tree.info.coverActions.play.i);
    tree.r.appendChild(tree.actualCover);

    //tree.r.style.transform = `translateX(${where}00%) scale(0.9)`;
    tree.actualCover.classList.add("actualCover");
    tree.info.remove.classList.add("remove", "bx", "bx-x");
    tree.info.r.classList.add("info");
    tree.info.position.classList.add("position");
    tree.info.author.classList.add("author");
    tree.info.songTitle.classList.add("songTitle");
    tree.info.albumTitle.classList.add("albumTitle");
    tree.info.coverActions.r.classList.add("coverActions");
    tree.info.coverActions.like.i.classList.add(
        "bx", "hoverImg", "icon",
        info.likeStatus === 1 ? "bxs-like" : "bx-like"
    );
    tree.info.coverActions.download.i.classList.add(
        "bx", "hoverImg", "icon",
        "bx-download"
    );
    tree.info.coverActions.dislike.i.classList.add(
        "bx", "hoverImg", "icon",
        info.likeStatus === -1 ? "bxs-dislike" : "bx-dislike"
    );

    tree.info.coverActions.play.r.classList.add("coverPlay");
    tree.info.coverActions.play.i.classList.add(
        "bx", "hoverImg", "icon",
        "bx-play"
    );
    tree.info.coverActions.play.r.addEventListener("click", async () => {
        const where = parseInt(tree.r.getAttribute("data-where") || 0);
        if (!where || where <= 0 || tryingToPlay) { return; }
        tryingToPlay = true;

        if (where !== 1) {
            if (where > 2) {
                background.currentPlaylist.splice(0, where - 2);
            }
            background.comingSong = background.currentPlaylist.shift();
        }

        await background.nextSong();
        updateCovers();
        tryingToPlay = false;
    });

    let tryingToLike = false;
    tree.info.coverActions.like.r.addEventListener("click", () => {
        if (tryingToLike) { return; }
        tryingToLike = true;
        background.addFeedbackFromToken(info.trackToken, false).then(() => {
            tryingToLike = false;
            tree.info.coverActions.like.i.classList.add("bxs-like");
            tree.info.coverActions.like.i.classList.remove("bx-like");
        }).catch(() => {
            tree.info.coverActions.like.i.style.color = "red";
            tryingToLike = false;
        });
    });

    let tryingToDislike = false;
    tree.info.coverActions.dislike.r.addEventListener("click", () => {
        if (tryingToDislike) { return; }
        tryingToDislike = true;
        background.addFeedbackFromToken(info.trackToken, false).then(() => {
            tryingToDislike = false;
            tree.info.coverActions.dislike.i.classList.add("bxs-dislike");
            tree.info.coverActions.dislike.i.classList.remove("bx-dislike");
        }).catch(() => {
            tree.info.coverActions.dislike.i.style.color = "red";
            tryingToDislike = false;
        });
    });

    if (info.coverSrc) {
        tree.actualCover.src = info.coverSrc;
    } else {
        tree.r.classList.add("noCover");
    }
    if (info.downloadLink) {
        tree.info.coverActions.download.r.href = info.downloadLink;
    }
    tree.info.position.innerText = (where < 0 ?
        (where === -1 ? "Previous song" : `${Math.abs(where)} songs ago`) :
        (where ===  1 ? "Next song" : `Coming in ${where} songs`)
    );
    tree.info.author.innerText = info.authorName;
    tree.info.author.href = info.authorLink;
    tree.info.songTitle.innerText = info.songTitle;
    tree.info.songTitle.href = info.songLink;
    tree.info.albumTitle.innerText = info.albumTitle;
    tree.info.albumTitle.href = info.albumLink;

    tree.info.remove.addEventListener("click", async () => {
        const where = parseInt(tree.r.getAttribute("data-where") || 0);
        if (!where || where <= 0) { return; }

        if (where === 1) {
            if (background.currentPlaylist.length === 0) {
                // nothing to shift
                await background.getPlaylist(localStorage.lastStation);
            }
            background.comingSong = background.currentPlaylist.shift();
        } else {
            background.currentPlaylist.splice(where - 2, 1);
        }
        tree.r.parentElement.removeChild(tree.r);
        updateCovers();
    });

    return tree.r;
}


function updateCovers() {
    const covers = document.getElementById("covers");

    /** @type {HTMLDivElement[]} */
    const children = [...covers.children];
    const feed = [
        ...(background.prevSongs || []),
        background.currentSong,
        background.comingSong,
        ...(background.currentPlaylist || [])
    ].filter(e => !!e); // if any of currentSong | comingSong | currentPlaylist is undefined, pop em'

    const prevSongsLength = (background.prevSongs || []).length;
    feed.forEach((song, i) => {
        let elem;
        const where = (i - prevSongsLength);
        const oldElem = children.find(e => (e.id === song.musicId));
        if (oldElem) {
            elem = oldElem;
        }
        if (!elem) {
            elem = generateCover(where, adaptSchema(song));
            elem.id = song.musicId;
            covers.appendChild(elem);
        } else {
            //elem.style.transform = `translateX(${where}00%) scale(0.9)`;
            elem.children[0].children[1].innerText = (where < 0 ?
                (where === -1 ? "Previous song" : `${Math.abs(where)} songs ago`) :
                (where ===  1 ? "Next song" : `Coming in ${where} songs`)
            );
            elem.setAttribute("data-where", where);
        }

        if (where === 0) {
            elem.classList.add("current");
        } else {
            elem.classList.remove("current");
        }
        if (where > 0) {
            elem.classList.add("leftAlign");
        } else {
            elem.classList.remove("leftAlign");
        }
    });
    const feedIds = feed.map(e => e.musicId);
    const toRemove = children.filter(e => !feedIds.includes(e.id));
    toRemove.forEach(e => {
        covers.scrollLeft -= e.clientWidth;
        e.parentElement && e.parentElement.removeChild(e);
    });

    if (autoScroll && document.querySelector(".current")) {
        // janky as hell
        // but it doesn't work without two
        // look I don't know why either
        ignoreAutoScroll = true;
        setTimeout(() => {
            ignoreAutoScroll = true;
            document.querySelector(".current").scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });
        }, 100);
        setTimeout(() => {
            ignoreAutoScroll = true;
            document.querySelector(".current").scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });
            setTimeout(() => {
                ignoreAutoScroll = false;
            }, SMOOTH_SCROLL_TIME);
        }, 1000);
    }
}

function updatePlayer() {
    updateCovers();
    if (background.currentSong) {
        gEID("coverLinkCell").style.setProperty("--img", "url(\""+(background.currentSong.albumArtUrl || "")+"\")");

        gEID("dash").innerText = "";


        gEID("titleLink").href = wipeTrackers(background.currentSong.songDetailUrl);
        gEID("titleLink").innerText = background.currentSong.songName;

        gEID("albumLink").href = wipeTrackers(background.currentSong.albumDetailUrl);
        gEID("albumLink").innerText = background.currentSong.albumName;
        
        artistLink.href = wipeTrackers(background.currentSong.artistDetailUrl);
        artistLink.innerText = background.currentSong.artistName;

        downloadButton.href = background.currentSong.audioUrlMap.highQuality.audioUrl;
        downloadButton.download = background.currentSong.songName.replace(/ /g, "_") + ".mp4";

        let tUC = tUpButton.children[0],
            tDC = tDownButton.children[0];
        if (background.currentSong.songRating === -1) {
            likeStatus = "disliked";
        } else if (background.currentSong.songRating === 0) {
            likeStatus = "unrated";
        } else if (background.currentSong.songRating === 1) {
            likeStatus = "liked";
        }
        if (background.currentSong.songRating === 1) {
            tUC.classList.add("bxs-like");
            tUC.classList.remove("bx-like");
            tDC.classList.add("bx-dislike");
            tDC.classList.remove("bxs-disliked");
            likeStatus = "liked";
        } else if (background.currentSong.songRating === -1) {
            tUC.classList.remove("bxs-like");
            tUC.classList.add("bx-like");
            tDC.classList.remove("bx-dislike");
            tDC.classList.add("bxs-disliked");
        } else {
            tUC.classList.remove("bxs-like");
            tUC.classList.add("bx-like");
            tDC.classList.remove("bxs-dislike");
            tDC.classList.add("bx-dislike");
        }

        tDownButton.children[0] && tUpButton.children[0].classList.remove("bxs-dislike");
        tDownButton.children[0] && tUpButton.children[0].classList.add("bx-like");
    }

    if (background.mp3Player.paused) {
        playButton.style.display = "";
        pauseButton.style.display = "none";
    } else {
        playButton.style.display = "none";
        pauseButton.style.display = "";
    }

    
    scrubber.value = 0;
    
    scrubShow.style.setProperty("--width", "0");
    updateStationCovers();
}

let likeStatus = "unrated";
let autoScroll = true;
let ignoreAutoScroll = true;

function drawPlayer() {
    
    var curMinutes = Math.floor((background.mp3Player.currentTime) / 60),
        curSecondsI = (
            (
                (Math.floor(background.mp3Player.currentTime) % 60) === 60
            ) ?
                0 : 
                (background.mp3Player.currentTime % 60)
        ),
        curSeconds = zeroPad(curSecondsI),
        totalMinutes = Math.floor((background.mp3Player.duration) / 60),
        totalSecondsI = (
            (
                (Math.floor(background.mp3Player.duration) % 60) === 60
            ) ?
                0 : 
                (background.mp3Player.duration % 60)
        ),
        totalSeconds = zeroPad(totalSecondsI);

    if (isNaN(curSecondsI) || isNaN(totalMinutes) || isNaN(totalSecondsI) || isNaN(curMinutes)) {
        gEID("timestamp").innerText = "Buffering...";
        scrubber.value = 100;
        scrubShow.style.setProperty("--width", 1);
    } else {
        gEID("timestamp").innerText = `${curMinutes}:${curSeconds}/${totalMinutes}:${totalSeconds}`;
        scrubber.value = (background.mp3Player.currentTime / background.mp3Player.duration) * 100;
        scrubShow.style.setProperty("--width", background.mp3Player.currentTime / background.mp3Player.duration);
    }
}

document.documentElement.style.setProperty("--height", localStorage.bodyHeight +"px");
document.documentElement.style.setProperty("--width", localStorage.bodyWidth+"px");
if (localStorage.themeInfo && localStorage.themeInfo !== "") {
    for (let key in JSON.parse(localStorage.themeInfo)) {
        document.documentElement.style.setProperty("--" + key, JSON.parse(localStorage.themeInfo)[key]);
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    pauseButton = gEID("pauseButton");
    playButton = gEID("playButton");
    prevTS = gEID("prevTab").children[0];
    nextTS = gEID("nextTab").children[0];
    downloadButton = gEID("downloadButton");
    artistLink = gEID("artistLink");
    stationRefreshButton = gEID("stationRefreshButton");
    skipButton = gEID("skipButton");
    tUpButton = gEID("tUpButton");
    tDownButton = gEID("tDownButton");
    stationFilterInput = gEID("stationFilterInput");
    unInput = gEID("username");
    pwInput = gEID("password");
    unWarning = gEID("unWarning");
    pwWarning = gEID("pwWarning");
    sleepButton = gEID("sleepButton");
    scrubber = gEID("scrubber");
    volume = gEID("volume");
    login = gEID("login");
    scrubShow = gEID("scrubShow");
    volShow = gEID("volShow");
    covers = gEID("covers");
    back = gEID("back");

    
    initTabs();

    if (background.mp3Player.paused) {
        playButton.style.display = "";
        pauseButton.style.display = "none";
    } else {
        playButton.style.display = "none";
        pauseButton.style.display = "";
    }

    volume.value = (localStorage.volume ? localStorage.volume * 100 : 20);
    volShow.style.setProperty("--width", (localStorage.volume ? localStorage.volume * 100 : 20) / 100);
    
    volume.addEventListener("input", (e) => {
        background.mp3Player.volume = e.target.value / 100;
        localStorage.volume = e.target.value / 100;
        volShow.style.setProperty("--width", e.target.value / 100);
    });

    scrubber.addEventListener("input", (e) => {
        background.mp3Player.currentTime = background.mp3Player.duration * (e.target.value / 100);
        scrubShow.style.setProperty("--width", e.target.value / 100);
    });

    playButton.addEventListener("click", play_audio);
    pauseButton.addEventListener("click", pause_audio);

    skipButton.addEventListener("click", () => {
        scrubber.value = 0;
        scrubShow.style.setProperty("--width", "0");
        background.nextSong();
    });

    let tUC = tUpButton.children[0],
        tDC = tDownButton.children[0];

    tUC.classList.add((likeStatus == "liked" ? "bxs-like" : "bx-like"));
    tDC.classList.add((likeStatus == "disliked" ? "bxs-dislike" : "bx-dislike"));

    tUpButton.addEventListener("click", (e) => {
        if (likeStatus === "liked") {
            return;
        }
        background.addFeedback(-1, true);
        tUC.classList.add("bxs-like");
        tUC.classList.remove("bx-like");
        tDC.classList.add("bx-dislike");
        tDC.classList.remove("bxs-disliked");
        likeStatus = "liked";
        e.preventDefault(e);
    });
    
    tDownButton.addEventListener("click", (e) => {
        if (likeStatus === "disliked") {
            return;
        }
        background.addFeedback(-1, false);
        tUC.classList.remove("liked");
        tUC.classList.add("like");
        tDC.classList.remove("dislike");
        tDC.classList.add("disliked");
        likeStatus = "disliked";
        background.nextSong();
        e.preventDefault(e);
    });

    sleepButton.addEventListener("click", async function () {
        await background.sleepSong();
        background.nextSong();
    });


    unWarning.style.display = "none";
    pwWarning.style.display = "none";

    login.addEventListener("submit", function (e) {
        (async() => {
            localStorage.username = unInput.value;
            localStorage.password = pwInput.value;
            await background.partnerLogin();
            if (background.userAuthToken === "") {
                document.getElementById("li1").classList.add("warning");
                document.getElementById("li2").classList.add("warning");
            } else {
                await addStations();
                //move to mid panel
                goToPanel(2);
            }
        })();
        e.preventDefault();
        return false;
    });

    ["keypress", "change", "input", "paste"].forEach(e => {
        stationFilterInput.addEventListener(e, refreshStationList);
    });
    stationRefreshButton.addEventListener("click", async () => {
        stationRefreshButton.children[0].classList.add("bx-spin");
        await refreshStations();
        stationRefreshButton.children[0].classList.remove("bx-spin");
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
        goToPanel(3);
    } else {
        if (!localStorage.lastStation) {
            goToPanel(2);
        }
        if (localStorage.lastStation && !localStorage.tabOn) {
            goToPanel(1);
        }
    }

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
    requestAnimationFrame(() => {
        const curr = document.querySelector(".current");
        if (!curr) { return; }

        covers.addEventListener("scroll", () => {
            ignoreAutoScroll = false;
        }, { once: true, passive: true });

        requestAnimationFrame(() => {
            curr.scrollIntoView({
                behavior: "auto",
                block: "center",
                inline: "center"
            });
        });
    });
    covers.addEventListener("scroll", () => {
        if (ignoreAutoScroll) { return; }
        console.log("yeet");
        const curr = document.querySelector(".current");
        if (!curr) { return; }

        if (
            Math.abs(
                curr.getBoundingClientRect().left - 
                (window.innerWidth - (curr.clientWidth / 2))
            )
            > 50
        ) {
            autoScroll = false;
            back.classList.remove("out");
        } else {
            autoScroll = true;
            back.classList.remove("add");
        }
    }, { passive: true });

    back.addEventListener("click", () => {
        autoScroll = true;
        back.classList.add("out");
        ignoreAutoScroll = true;
        requestAnimationFrame(() => {
            let curr = document.querySelector(".current");
            if (!curr) { return; }
            
            curr.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });

            setTimeout(() => {
                ignoreAutoScroll = false;
            }, SMOOTH_SCROLL_TIME);
        });
    });
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
    playButton.style.display = "block";
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