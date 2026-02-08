"use strict"
/*global partnerLogin, getPlaylist, currentPlaylist, platform_specific, get_browser, is_android*/
/*exported setCallbacks, play, downloadSong, playStation, mp3Player*/

get_browser().runtime.onInstalled.addListener(async () => {
    const rules = [
        {
            id: 1,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [{
                    header: "User-Agent",
                    operation: "set",
                    value: "libcurl"
                }],
            },
            condition: {
                domains: [get_browser().runtime.id],
                urlFilter: '|tuner.pandora.com',
                resourceTypes: ['xmlhttprequest'],
            },
        }
    ];
    await get_browser().declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id),
        addRules: rules,
    });
});

let mp3Player = document.getElementById('mp3Player');

var callbacks = {
    updatePlayer: [],
    drawPlayer: [],
};
var currentSong;
var prevSongs = [];

function setCallbacks(updatePlayer,drawPlayer){
    callbacks.updatePlayer.push(updatePlayer);
    callbacks.drawPlayer.push(drawPlayer);
}

async function play() {
    if (mp3Player.currentTime > 0) {
        mp3Player.play();
    } else {
        await nextSong();
    }
}

async function seekBack() {
    if (bg_config.doRewinds && (mp3Player?.currentTime > bg_config.rewindDuration)) {
        await restartSong();
    } else {
        await replaySong(prevSongs[0], true);
    }
}

async function restartSong() {
    if (mp3Player.currentTime === 0) {
        return;
    }

    mp3Player.currentTime = 0;
}

async function replaySong(track, pushForwards=false) {
    if (!track) {
        return;
    }
    if (currentSong) {
        // If skipping back through history linearly,
        // we want "discarded" songs to go back into "next songs queue" - currentPlaylist
        // so that going forward plays them again, in order.

        // If we're playing selected tracks from the history,
        // we want to "discard" the songs onto the top of history,
        // as no linear direction is inferred.
        if (pushForwards) {
            if (currentSong != currentPlaylist[0]) {
                currentPlaylist.unshift(currentSong);
            }
        } else {
            if (currentSong != prevSongs[0]) {
                prevSongs.unshift(currentSong);
            }
        }
    }

    currentSong = track;

    let prevIndex = prevSongs.indexOf(track);
    if (prevIndex !== -1) {
        prevSongs.splice(prevIndex, 1);
    }
    
    mp3Player.src = currentSong.audioUrl;
    mp3Player.play();

    updatePlayers();
}

let awaitingNewStation = false;
async function playStation(stationToken) {
    if (awaitingNewStation || stationToken === currentStationToken) {
        return;
    }
    awaitingNewStation = true;
    localStorage.setItem('lastStation', stationToken);
    currentStationToken = stationToken;
    currentPlaylist = [];
    currentPlaylist.push(...await singletonGetPlaylist(stationToken));
    awaitingNewStation = false;
    await nextSong();
}

const registeredAds = {};

async function registerAds(track) {
	if (!bg_config.registerAds) {
		return;
	}
	if (!track.adTrackingTokens) {
		return;
	}
	if (registeredAds[track.adToken]) {
		return;
	}

	registeredAds[track.adToken] = true;

	return await sendRequest('ad.registerAd',
		{
			userAuthToken: currentUserInfo.authToken,
			syncTime: getSyncTime(),
			adTrackingTokens: track.adTrackingTokens,
			stationId: track.stationId
		}
	);
}

async function nextSong(depth=1) {
    if (depth > 4){
        return;
    }
    if (currentSong) {
        if (currentSong != prevSongs[0]) {
            prevSongs.unshift(currentSong);

			let maxHistoryEntries = getPresetMetaVariable('maxHistoryEntries');
            if (prevSongs.length > maxHistoryEntries) {
                let removedTracks = prevSongs.splice(maxHistoryEntries, prevSongs.length - maxHistoryEntries);
                for (let removedTrack of removedTracks) {
                    // this should stop registeredAds from getting hilariously large
                    if (removedTrack.adToken) {
                        delete registeredAds[removedTrack.adToken];
                    }

                    // release art blob
                    if ('artBlobUrl' in removedTrack && removedTrack.artBlobUrl) {
                        URL.revokeObjectURL(removedTrack.artBlobUrl);
                    }
                }
            }
        }
    }
    if (!currentStationToken) {
        currentStationToken = localStorage.getItem('lastStation');
    }

    
    // if there'll be one song left after this one,
    // preload it (but don't block on it)
    // if they skip before it's finished preloading (and populating the currentPlaylist),
    // THEN block on it
    if (currentPlaylist.length === 2) {
        singletonGetPlaylist(currentStationToken).then(e => currentPlaylist.push(...e));
    } else if (currentPlaylist.length < 2) {
        let songs = await singletonGetPlaylist(currentStationToken);
        if (!currentPlaylist.includes(songs[0])) {
            currentPlaylist.push(...songs);
        }
    }

    currentSong = currentPlaylist.shift();

    mp3Player.src = currentSong.audioUrl;
    mp3Player.play();
	registerAds(currentSong);

    updatePlayers();
}

function setup_commands() {
    if (!is_android()) {
        get_browser().commands.onCommand.addListener(function(command) {
            if (command === "pause_play") {
                if (!mp3Player.paused) {
                    mp3Player.pause();
                } else {
                    play();
                }
            } else if(command === "skip_song") {
                nextSong();
            }
        });
    }
}

function setup_mediasession() {
    if (!('mediaSession' in navigator)) {
        return;
    }

    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", () => mp3Player.pause());
    navigator.mediaSession.setActionHandler("previoustrack", seekBack);
    navigator.mediaSession.setActionHandler("nexttrack", () => nextSong());
    navigator.mediaSession.setActionHandler("seekto", function(details) {
        mp3Player.currentTime = details.seekTime;
    });
}

function update_mediasession() {
    if (!('mediaSession' in navigator)) {
        return;
    }

    // https://github.com/snaphat/pandora_media_session/blob/main/pandora_media_session.user.js#L45
    // Populate metadata
    var metadata = navigator.mediaSession.metadata;
    if (!metadata || (
        metadata.title != currentSong.songName ||
        metadata.artist != currentSong.artistName ||
        metadata.artwork[0].src != (currentSong.artBlobUrl ?? currentSong.albumArtUrl))
        ) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.songName,
            artist: currentSong.artistName,
            artwork: [{ src: (currentSong.artBlobUrl ?? currentSong.albumArtUrl), sizes: '500x500', type: 'image/jpeg' }]
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

const updatePlayers = () => {
    update_mediasession();
    callbacks.updatePlayer.forEach((e) => {
        try {
            e();
        } catch(b) {
            callbacks.updatePlayer.splice(callbacks.updatePlayer.indexOf(e), 1);
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    mp3Player = document.getElementById('mp3Player');
    mp3Player.volume = 1;

    platform_specific();

    setup_commands();

    setup_mediasession();

    mp3Player = document.getElementById('mp3Player');

    mp3Player.addEventListener("play", updatePlayers);
    mp3Player.addEventListener("pause", updatePlayers);
    mp3Player.addEventListener("canplay", updatePlayers);
    mp3Player.addEventListener("ended", function () {
        nextSong().then(update_mediasession);
    });
    mp3Player.addEventListener("timeupdate", function () {
        update_mediasession();
        callbacks.drawPlayer.forEach((e) => {
            try {
                e();
            } catch(b) {
                callbacks.drawPlayer.splice(callbacks.drawPlayer.indexOf(e), 1);
            }
        });
    });
	let errorResponseFunc = debounceFunction(() => nextSong().then(update_mediasession), MIN_ERRORSKIP_DELAY)
    mp3Player.addEventListener("error", errorResponseFunc);
});

function updatePopupUrl() {
    browserThemeIsLight = prefersLightMedia.matches;
    let usedPopup = getEffectivePreset().playerType + '.htm';
    get_browser().browserAction.setPopup({
        popup: usedPopup
    });
}
// On firefox, this matches the browser chrome's UI theme
// not the user's preferred website content theme.
// figures
// there's no good way around this, so I'll just note it down
var prefersLightMedia = matchMedia(`(prefers-color-scheme: light)`);
prefersLightMedia.addEventListener('change', updatePopupUrl);
updatePopupUrl();

// why does this exist? because the popup doesn't "take" the first time.
// love race conditions.
setTimeout(updatePopupUrl, 150);
var browserThemeIsLight = prefersLightMedia.matches;

let timeoutIdentifier = null;
function interactionHappened() {
	if (timeoutIdentifier) {
		window.clearTimeout(timeoutIdentifier);
	}

	if (!bg_config.pauseAfterInactivity) {
		return;
	}

	timeoutIdentifier = window.setTimeout(() => {
		if (!mp3Player.paused) {
			mp3Player.pause();
		}
	}, bg_config.inactivityDuration * 60 * 1000)
}
