"use strict"
/*globals $, encrypt, decrypt, currentSong, play, prevSongs*/
/*exported addFeedback, explainTrack, search, createStation, sleepSong, setQuickMix, deleteStation */

/** @link {http://stackoverflow.com/questions/1240408/reading-bytes-from-a-javascript-string} */
function stringToBytes(str) {
    var ch, st, re = [];
    for(var i = 0; i < str.length; i ++) {
        ch = str.charCodeAt(i);  // get char
        st = [];                 // set up "stack"
        do {
            st.push(ch & 0xFF);  // push byte to stack
            ch = ch >> 8;          // shift value down by 1 byte
        }
        while (ch);
        // add stack contents to result
        // done because chars have "wrong" endianness
        re = re.concat(st.reverse());
    }
    // return an array of bytes
    return re;
}

var currentStationToken = null;
var stationsArray = [];
var stationsByToken = {};
var currentPlaylist = [];

let maxRetries = 2;
/**
 * Purposeful var here: `let` doesn't put properties on window object, so inaccessible to popup window
 * If authToken is `null`, it has expired.
 * @typedef {{logged_in: true, credsSeemGood: boolean, email: string, authToken: string | null, userId: string }} LoggedInUserInfo
 * @typedef {{logged_in: false, credsSeemGood: boolean, email: never, authToken: never, userId: never}} LoggedOutUserInfo
 * @type {LoggedOutUserInfo | LoggedInUserInfo} */
var currentUserInfo = {
    logged_in: false,
    credsSeemGood: true
}

/** @type {{partnerId: null, authToken: null, syncTime: never, clientStartTime: never} | {partnerId: string, authToken: string, syncTime: number, clientStartTime: number}} */
let partnerInfo = {
    partnerId: null,
    authToken: null
}

function getSyncTime() {
    let time = (new Date()).getTime();
    let now = parseInt(String(time).substring(0, 10), 10);
    return parseInt(partnerInfo.syncTime) + (now - partnerInfo.clientStartTime);
}

/**
 * @type {(methodOrParams: string | Record<string, string>, body: Record<string, unknown>, encrypted?: boolean, currentRetry?: number) => Promise<{ ok: true, response: unknown, reason: never } | { ok: false, reason: string, response: Response }>
 * */
async function sendRequest(methodOrParams, body, encrypted = true, retries = 0) {
    // This function is used to communicate with Pandora,
    // and as such is the heart of Anesidora.
    // 
    // This function serves 5 purposes:
    // 1. Format requests in such a way that Pandora will accept them
    // 2. If needed, encrypt the request body *in addition* to HTTPS
    // 3. Pass the request to the browser to make
    // 4. Handle errors
    // 5. If needed, retry.

    // ---- //

    /// 1. Format requests in such a way that Pandora will accept them
    // We use Pandora's JSON API, unoficially documented here:
    // https://6xq.net/pandora-apidoc/json/

    // A request to Pandora consists of three parts:
    // (a). The 'parameters'. These usually include authorization information,
    // such as the user's ID, the partner we're impersonating's ID, and
    // the "auth token" (a temporary password generated upon login).
    // These are almost always included automatically.
    // (b). The 'method', or the name of what we're trying to do.
    // For example, "user.sleepSong" is the method to sleep a song.
    // (c). The 'body', which includes more information about what we're trying to do.
    // For example, *which* song we're trying to sleep.
    // Combined, these are "who I am", "what I'm doing", and "what I'm doing it to."

    
    // The method is actually passed as the first parameter,
    // but since there is usually no need to add any extra parameters
    // this function allows taking EITHER the method name OR a list (object) of parameters.

    // Therefore, our first step is to, if needed,
    // turn a method name into a list of parameters.
    let userDefinedParams = {};
    if (typeof methodOrParams === 'string') {
        userDefinedParams = {
            method: methodOrParams
        }
    } else {
        userDefinedParams = methodOrParams;
    }

    let parametersObject = null;
    if (currentUserInfo.authToken) {
        parametersObject = {
            auth_token: currentUserInfo.authToken,
            partner_id: partnerInfo.partnerId,
            user_id: currentUserInfo.userId,
            ...userDefinedParams
        };
    } else {
        parametersObject = userDefinedParams;
    }

    // According to the documentation,
    // the request body should always include the
    // current user's auth token and syncTime, if available.
    if (currentUserInfo.authToken) {
        body.userAuthToken = currentUserInfo.authToken;
    }
    if (partnerInfo.syncTime) {
        // The syncTime prevents replay attacks by making sure
        // request bodies include the time they're sent.
        body.syncTime = getSyncTime();
    }
    
    // Format the parameters to be used in a request
    // "key1=value1&key2=value2"
    let parametersString = new URLSearchParams(parametersObject).toString();
    
    // 2. If needed, encrypt the request body *in addition* to HTTPS
    // This API was made before HTTPS was popular, so it uses its own encryption scheme.
    // Every request is encrypted using Blowfish ECB, *except* for Partner login.
    let encrypted_body = encrypted ? encrypt(JSON.stringify(body)) : JSON.stringify(body);
    
    /** @type {Response} */
    let response;
    /** @type {Record<string, unknown>} */
    let responseBody;
    try {
        // 3. Pass the request to the browser to make
        response = await fetch("https://tuner.pandora.com/services/json/?" + parametersString, {
            method: 'POST',
            headers: {
                "Content-Type": encrypted ? 'text/plain' : 'application/json'
            },
            body: encrypted_body
        })
        responseBody = await response.json()
    } catch(e) {
        // 4. Handle errors
        // Something's gone wrong.
        // This will almost always be network errors:
        // The user has disconnected from the Internet
        // or is behind a misbehaving proxy.

        // These are handled by retrying,
        // with a longer period of time between each retry.
        if (retries < maxRetries) {
            await new Promise(res => setTimeout(res, ((2**retries)-1) * 1000));
            // First retry would take one second,
            // Second would take three,
            // Third would take seven.
            // Current max is three, but next retry would take fifteen seconds.
            return await sendRequest(methodOrParams, body, encrypted, retries + 1)
        } else {
            return {
                ok: false,
                reason: "Network error. Can you connect to pandora.com?",
                response: response
            }
        }
    }

    if ('debugRequests' in window) {
        // Usually, you can view requests and responses in the
        // network pane of DevTools.
        // Unfortunately, the request bodies are encrypted, so you'd just see bytes.
        // This helps, when needed.
        console.group(parametersObject.method);
        console.log(parametersObject, body);
        console.log(responseBody);
        console.groupEnd();
    }
    
    if (responseBody.stat === "fail") {
        // 4. Handle errors
        // Something has gone wrong, but in a different way.
        // In this case, our request has reached Pandora -
        // but Pandora has said "no, you're doing it wrong."
        // Retrying usually does not help.

        switch (responseBody.code) {
            case 0: { // "INTERNAL ERROR"
                // Sometimes rate limiting.
                // Purposefully do not retry.
                return {
                    ok: false,
                    reason: "Internal Pandora error. Might be rate limited.",
                    response: responseBody
                };
            }

            case 1001: {
                // INVALID_AUTH_TOKEN
                // Either the user token has expired,
                // or was never valid in the first place.

                // If the auth token WAS good at some point:
                if (currentUserInfo.credsSeemGood) {
                    // DO retry - but first, refresh user auth token.
                    currentUserInfo.credsSeemGood = false; // This will be set back in userLogin.
                    currentUserInfo.authToken = null;
                    let partnerResult = await partnerLogin();
                    if (!partnerResult.ok) {
                        // What?
                        // This should never fail, unless we're having network errors
                        // But that's not the case, since we got a response from
                        // Pandora that says "that token's no good."

                        // Seriously, what?
                        return;
                    }
                    let userLoginResult = await userLogin();
                    if (userLoginResult.ok) {
                        console.info("Relogged to refresh auth token.");
                    }
                    // Continue to retry.
                    break;
                } else {
                    // Either it was never good, or we can't get a new good one.
                    // Do not retry.
                    return {
                        ok: false,
                        reason: "User auth token expired, and could not be refreshed.",
                        response: responseBody
                    }
                }
            }

            default:
                console.log("sendRequest failed: ", parametersString, body, responseBody);
        }

        if (retries < maxRetries) {
            // Wait for a bit before retrying.
            // This avoids retrying too fast causing errors.
            await new Promise(res => setTimeout(res, ((2**retries)-1) * 1000));
            // First retry would take one second,
            // Second would take three,
            // Third would take seven.
            // Current max is three, but next retry would take fifteen seconds.
            return await sendRequest(methodOrParams, body, encrypted, retries + 1)
        } else {
            return {
                ok: false,
                reason: `Max retries reached. Response code: ${responseBody.code}`,
                response: responseBody
            }
        }
    } else {
        return {
            ok: true,
            response: responseBody
        };
    }
}

/** @type {number} */
let lastStationsRefresh = Date.now();
async function throttleRefreshStationsList(timeout=120) {
    if (lastStationsRefresh < (Date.now() + (timeout*1000))) {
        return;
    }

    lastStationsRefresh = Date.now();
    await refreshStationsList();
}

/** @type {{ok: true, reason: never } | {ok: false, reason: string }} */
async function refreshStationsList() {
    let request = await sendRequest("user.getStationList", { includeStationArtUrl: true });
    if (!request.ok) {
        return {
            ok: false,
            reason: request.reason
        };
    }

    let unprocessedStations = request.response.result.stations;
    for (let removedStation of stationsArray) {
        let next = unprocessedStations(e => e.stationId === removedStation.stationId);

        if (removedStation.artBlobUrl && next) {
            next.artBlobUrl = removedStation.artBlobUrl;
        } else if (removedStation.artBlobUrl) {
            URL.revokeObjectURL(removedTrack.artBlobUrl);
        }
    }
    for (let item of unprocessedStations) {
        loadStationArtIntoCache(item);
        if (item.artUrl) {
            item.artUrl = toHTTPS(item.artUrl);
        }
    }
    stationsArray = unprocessedStations;
    stationsByToken = {};
    stationsArray.forEach(e => {
        stationsByToken[e.stationToken] = e;
    })

    return { ok: true };
}


/**
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{ ok: false, reason: string } | { ok: true, reason: never }>}
 */
async function userLogin(
    email = localStorage.getItem('username'),
    password = localStorage.getItem('password')
) {
    // This function authenticates the user with Pandora.
    // There are two steps to such:
    // 1. Partner login:
    // This tries to ensure we are using an official Pandora app,
    // and stores a partnerId and partnerAuthToken, which are used in step 2.
    // Obviously, we are not using an official Pandora app, so
    // we pretend to be an old version of their Android app.
    // 2. User login:
    // Actually send the user's login to Pandora.
    // If login is successful, they'll send back an "auth token" that
    // we can use instead of a username/password combo.
    // The auth token will expire after somewhere between 4 and 18 hours.

    // Many services have a "token regenerate" feature, where you can give them
    // your old expired token and it gives you back a fresh one.
    // If Pandora had that, we wouldn't need to store the user's password at all.
    // Unfortunately, they don't - or if they do it's not documented - so
    // we have to just log in again every time the token expires.
    

    // If we are missing either the email or password,
    // abort.
    if (!email || !password) {
        return {
            ok: false,
            reason: "No username and/or password provided."
        }
    }

    // 1. If we have not already completed Partner login, do so.
    if (!partnerInfo.partnerId || !partnerInfo.authToken) {
        let partnerResult = await partnerLogin();
        if (!partnerResult.ok) {
            return partnerResult;
        }
    }

    
    // Usually "auth_token" will be set to the user's token,
    // but we don't have that yet.
    // So in this one case, we set it to the partner/app token.
    // This is why we do Partner login first
    let parameters = {
        method: 'auth.userLogin',
        auth_token: partnerInfo.authToken,
        partner_id: partnerInfo.partnerId
    }
    let body = {
        loginType: "user",
        username: email,
        password,
        partnerAuthToken: partnerInfo.authToken,
    };

    let loginResponse = await sendRequest(
        parameters,
        body,
        true /* do encrypt */,
        maxRetries /* do not retry */
    );

    if (!loginResponse.ok) {
        // If there's an issue, the most common one will be
        // that the username/password are incorrect.
        // Pandora sets an "error code" to say what the problem is.

        // The only one we know (for user login) is
        // the "incorrect username/password" code, which is "1002"
        if (loginResponse.response.code === 1002) {
            return {
                ok: false,
                reason: "Username or password is incorrect."
            };
        }

        // Otherwise, we have no idea what the error is, so just report back what sendRequest said.
        return {
            ...loginResponse,
            reason: "Error: " + loginResponse.reason
        };
    }

    // OK, we did not get an error code.
    // So we can assume that what we got back is correct.
    // Store the auth token:
    currentUserInfo = {
        ...currentUserInfo,
        credsSeemGood: true,
        logged_in: true,
        authToken: loginResponse.response.result.userAuthToken,
        userId: loginResponse.response.result.userId,
        email
    }
    
    localStorage.setItem('username', email);
    localStorage.setItem('password', password);

    // And we're done.
    return {
        ok: true
    }
}

function userLogout() {
    // Remove temporary info
    currentUserInfo = {
        credsSeemGood: false,
        logged_in: false
    }

    // Reset player state
    currentPlaylist = [];
    stationsArray = [];
    stationsByToken = {};
    mp3Player.src = '';
    mp3Player.pause();
    
    // Remove stored info
    localStorage.removeItem('username');
    localStorage.removeItem('password');
}

/** @type {() => Promise<{ ok: true, reason: never } | { ok: false, reason: string }>} */
async function partnerLogin() {
    let body = {
        // These are not user logins;
        // these are "partner logins", Pandora's attempt
        // to make sure nobody can impersonate their apps.
        // Too bad! Turns out you can just grab those from their apps' code.
        username: "android",
        password: "AC7IBG09A3DTSYM4R41UJWL07VLN8JI7",
        version: "5",
        deviceModel: "android-generic",
        includeUrls: true
    };
    let partnerLoginRequest = await sendRequest("auth.partnerLogin", body, false);
    let response = partnerLoginRequest.response;
    if (!('result' in response)) {
        return {
            ok: false,
            reason: "Partner login failed, somehow."
        }
    }

    var b = stringToBytes(decrypt(response.result.syncTime));
    // skip 4 bytes of garbage
    var s = "", i;
    for (i = 4; i < b.length; i++) {
        s += String.fromCharCode(b[i]);
    }
    partnerInfo.syncTime = parseInt(s);
    partnerInfo.clientStartTime = parseInt((new Date().getTime() + "").substr(0, 10));
    partnerInfo.partnerId = response.result.partnerId;
    partnerInfo.authToken = response.result.partnerAuthToken;

    return { ok: true };
}

let runningGetPlaylistCall = null;
async function singletonGetPlaylist(stationToken) {
    runningGetPlaylistCall ??= getPlaylist(stationToken);

    let actualResult = await runningGetPlaylistCall;
    runningGetPlaylistCall = null;
    return actualResult;
}

async function getPlaylist(stationToken) {
    let audioFormats = [
        "HTTP_128_MP3",
        "HTTP_64_AACPLUS_ADTS"
    ];
    if (is_android()) {
        audioFormats.shift();
    }

    let request = await sendRequest("station.getPlaylist", {
        stationToken,
        additionalAudioUrl: audioFormats.join(",")
    });

	if (!request.ok) {
		console.error('getPlaylist failed:',request);
		return;
	}
	/** @type {unknown[]} */
	let responseItems = request.response.result.items;

	if (!config.playAds) {
		responseItems = responseItems.filter(item => !item.hasOwnProperty('adToken'));
	} else {
		let fakeTrackPromises = [];
		for (let key in responseItems) {
			if ('adToken' in responseItems[key]) {
				let fakeTrackPromise = getAdInformationAsFakeTrack(responseItems[key]);
				fakeTrackPromises.push(fakeTrackPromise);
			}
		}
		let fakeItems = await Promise.all(fakeTrackPromises);
		responseItems = responseItems.map(item => {
			if ('adToken' in item) {
				// If any of the promises error, this will cause
				// the ads to be out of order or undefined.
				// Frankly, out of order is fine. It's internet radio, not on-demand.
				// But we don't want undefined items in the queue, so filter
				// those out after
				return fakeItems.shift();
			} else {
				return item;
			}
		}).filter(e => !!e);
	}

    if (config.cacheAlbumArt) {
        for (let item of responseItems) {
            if ('albumArtUrl' in item) {
                loadAlbumArtIntoCache(item);
            }
        }
    }
    
	if (config.httpsOnlyAssets) {
		responseItems = responseItems.map(remapAudioUrlsToHTTPS);
	}

    for (let item of responseItems) {
        let audioUrl;
        if (item.additionalAudioUrl != null && ('0' in item.additionalAudioUrl)) {
            audioUrl = item.additionalAudioUrl[0];
        } else {
            audioUrl = (
                item.audioUrlMap.highQuality?.audioUrl || 
                item.audioUrlMap.mediumQuality?.audioUrl || 
                item.audioUrlMap.lowQuality?.audioUrl
            );
        }

        if (audioUrl) {
            item.audioUrl = audioUrl;
        }
    }

    return responseItems;
}

async function tryGettingBlobUrl(artUrl) {
    if (!artUrl) {
        return;
    }

    artUrl = toHTTPS(artUrl);

    // This method is identifiably different from using new Image(), because
    // the request headers are fetch-specific rather than image-specific.
    // i.e., the Accept: header is set to generic rather than image/jpeg, etc
    // This shouldn't matter until they actually check that.

    let imageBlob;
    try {
        // Try fetching a small version
        let imageResponse = await fetch(artUrl.replace('1080W_1080H', '500W_500H'));
        imageBlob = await imageResponse.blob();
    } catch(e) {
        // Alright, just use the full version then.
        let imageResponse = await fetch(artUrl);
        imageBlob = await imageResponse.blob();
    }
    
    return URL.createObjectURL(imageBlob);
}

async function loadStationArtIntoCache(item) {
    let artUrl = item.artUrl;
    if (!artUrl) {
        return;
    }
    
    item.artBlobUrl = await tryGettingBlobUrl(artUrl);
}
async function loadAlbumArtIntoCache(item) {
    let artUrl = item.albumArtUrl;
    if (!artUrl) {
        return;
    }
    
    item.artBlobUrl = await tryGettingBlobUrl(artUrl);
}

async function getAdInformationAsFakeTrack(ad) {
	if (!('adToken' in ad)) {
		console.group('getAdInformationAsFakeTrack()');
		console.trace("Something's wrong here: No adToken in ad.");
		console.error(ad);
		console.groupEnd();
		return ad;
	}

	let request = await sendRequest('ad.getAdMetadata', {
        userAuthToken: currentUserInfo.authToken,
        syncTime: getSyncTime(),
		adToken: ad.adToken,
		supportAudioAds: true,
		returnAdTrackingTokens: true
	});

	if (!request.ok) {
		console.group('getAdInformationAsFakeTrack()');
		console.trace("Request failed.");
		console.error(request);
		console.groupEnd();
		return ad;
	}

	let result = request.response.result;

	return {
		songName: 'Advertisement',
		audioUrlMap: result.audioUrlMap,
		clickThroughUrl: result.clickThroughUrl,
		adTrackingTokens: result.adTrackingTokens,
		allowFeedback: false,
		songRating: 0,
		albumName: "",
		albumArtUrl: result.imageUrl,
		artistName: result.companyName,
	}
}

function remapAudioUrlsToHTTPS(item) {
    if (item.audioUrlMap) {
        for (let key in item.audioUrlMap) {
            item.audioUrlMap[key].audioUrl = item.audioUrlMap[key].audioUrl.replace(/^http:/, 'https:');
        }
    }
    if (item.additionalAudioUrl) {
        item.additionalAudioUrl = item.additionalAudioUrl.map(
            url => url.replace(/^http:/, 'https:')
        );
    }
    
    return item;
}

async function addFeedback(track, ratingIsPositive) {
	if (track.adToken) {
		return false; // You can't rate ads.
	}
    if (track.songRating === (ratingIsPositive ? 1 : -1 )) {
        return true; // no action needed
    }

    let req = await sendRequest("station.addFeedback", {
        trackToken: track.trackToken,
        // This may change in the future, but for now all station tokens
        // are just the station id. Works for me.
        stationToken: track.stationId,
        isPositive: ratingIsPositive
    });
    if (req.ok) {
        track.songRating = (ratingIsPositive ? 1 : -1);
        track.feedbackId = req.response.result.feedbackId;

		if (
            config.skipAfterDislike
            && track.trackToken === currentSong.trackToken
            && !ratingIsPositive
        ) {
			await nextSong();
		}

        return true;
    } else {
        // noop. nothing to do

        return false;
    }
}

async function deleteFeedback(track, ignoreExistingFeedbackId=false) {
    if (track.songRating === 0) {
        // Nothing to do.
        return true;
    }

    /** @type {string | null | undefined} */
    let feedbackId = null;
    if (track.feedbackId && !ignoreExistingFeedbackId) {
        feedbackId = track.feedbackId;
    } else {
        let stationInfoReq = await sendRequest("station.getStation", {
            // This may change in the future, but for now all station tokens
            // are just the station id. Works for me.
            stationToken: track.stationId,
            includeExtendedAttributes: true
        });

        if (!stationInfoReq.ok) {
            return false;
        }

        let stationInfo = stationInfoReq.response.result;
        let infoKey = (track.songRating === 1 ? "thumbsUp": "thumbsDown");

        feedbackId = stationInfo.feedback[infoKey].find(item => item.songIdentity === track.songIdentity)?.feedbackId;
    }

    if (feedbackId) {
        let req = await sendRequest('station.deleteFeedback', { feedbackId });

        if (!req.ok && !ignoreExistingFeedbackId) {
            // This should always work, unless there is a network error.
            return await deleteFeedback(track, true);
        }
        
        return req.ok;
    } else {
        return false;
    }
}

async function sleepSong() {
    await sendRequest("user.sleepSong", {
        trackToken: currentSong.trackToken
    });
}

async function createStation(musicToken) {
    let request = await sendRequest("station.createStation", { musicToken });
    await play(request.response.result.stationId);
}

async function deleteStation(stationToken) {
    await sendRequest("station.deleteStation", { stationToken });
}

async function explainTrack(trackToken = currentSong.trackToken) {
    return await sendRequest("track.explainTrack", { trackToken });
}

function generateTrackFilename(track) {
	if (!config.renameDownloads) {
		return null;
	}

	let templateString = config.downloadNameFormatString
			.replaceAll('%trackname%', track.songName)
			.replaceAll('%trackid%', track.musicId)
			.replaceAll('%artistname%', track.artistName);

	if (config.limitFilenameLength) {
		let splitByExt = templateString.split('.');
		let ext = splitByExt.pop();
		templateString = splitByExt.join('.').substring(0, 32) + '.' + ext;
	}

	return templateString;
}

function downloadRawSong(track) {
    // Fallback, in case rich doesn't work

    return [
        track.audioUrl,
        generateTrackFilename(track)
    ]
}

async function downloadRichSong(track) {
    if (!track) {
        return null;
    }
    if (!config.tagDownloads || !MP3Tag) {
        return downloadRawSong(track);
    }
    const artworkPath = track.artBlobUrl || track.albumArtUrl;

    const audioBufferPromise = async () => {
        let audioRequest = await fetch(track.audioUrl);
        return await audioRequest.arrayBuffer();
    }

    const artBufferPromise = async () => {
        if (!artworkPath) {
            return null;
        }
        const artRequest = await fetch(artworkPath);
        const artBuffer = await artRequest.arrayBuffer();
        const artBytes = new Uint8Array(artBuffer)

        return artBytes;
    }
    let audioBuffer, artBytes;
    try {
        [audioBuffer, artBytes] = await Promise.all([
            audioBufferPromise(),
            artBufferPromise()
        ]);    
    } catch(e) {
        return downloadRawSong(track);
    }

    const mp3Tagger = new MP3Tag(audioBuffer, true)

    mp3Tagger.read()

    if (artBytes && artworkPath.includes('.jpg')) {
        console.log('Adding art');
        mp3Tagger.tags.v2.APIC = [
            {
                format: 'image/jpeg',
                type: 3,
                description: 'Album image',
                data: artBytes
            }
        ]
    }

    mp3Tagger.tags.title = track.songName;
    mp3Tagger.tags.artist = track.artistName;
    mp3Tagger.tags.album = track.albumName;

    // Save the tags
    mp3Tagger.save()

    // Handle error if there's any
    if (mp3Tagger.error !== '') {
        console.error(mp3Tagger.error);
        return downloadRawSong(track);
    }

    // Create blob
    let richSongBytes = new Uint8Array(mp3Tagger.buffer);


    return [
        URL.createObjectURL(new Blob([richSongBytes], { type: 'audio/aac' })),
        generateTrackFilename(track)
    ];
}

async function tryExistingLogin() {
    if (!localStorage.getItem('username') || !localStorage.getItem('password')) {
        return {
            ok: false,
            reason: "No current credentials."
        };
    }

    let partnerResult = await partnerLogin();
    if (!partnerResult.ok) {
        return partnerResult;
    }

    await userLogin();
    refreshStationsList();
}

tryExistingLogin();
