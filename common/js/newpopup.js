"use strict";
/** @type {keyof typeof ALL_SCREENS} */
background?.interactionHappened();

// Do this before page renders so transition animation does not play
document.documentElement.style.setProperty("--current-screen-index", ALL_SCREENS.indexOf(bg_config.currentScreen));

if (window.location.search) {
    let searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('settingsPreview')) {
        document.documentElement.style.overflow = 'hidden';
        setTimeout(() => {
            if (document.querySelector('main')) {
                document.querySelector('main').style.transition = 'none';
            }
        }, 2)
    }
}

// Please keep in sync with cozy.htm:15 and compact.htm
const ICONS = /** @type {const} */ ([
    'link', 'play', 'pause', 'refresh', 'login'
]);

const fuzzyStringSearch = (haystack, needle) => {
    let lowerHaystack = haystack.toLowerCase();
    let lowerNeedle = needle.toLowerCase();
    let matches = 0;
    if (lowerNeedle.length === 0) {
        return 0;
    }
    if (lowerHaystack.length === 0) {
        return 0;
    }
    if (lowerHaystack.indexOf(lowerNeedle) > -1) return 1; // covers basic partial matches
    for (let i = 0; i < lowerNeedle.length; i++) {
        lowerHaystack.indexOf(lowerNeedle[i]) > -1 ? matches += 1 : matches -=1;
    }
    return Math.max(0, matches/lowerHaystack.length);
};

document.addEventListener('DOMContentLoaded', () => {
    if (Math.abs(document.documentElement.clientWidth - document.body.clientWidth) > 10) {
        // We're in a mobile context, or otherwise on a separate page
        document.documentElement.style.setProperty('--viewport-width', '100vw');
        document.documentElement.style.setProperty('--viewport-height', '100vh');
    }

    const initializeNavigation = () => {
        const navigationScrollItems = document.querySelector('.navigation-scroll-items');
        const mainElement = document.getElementsByTagName('main')[0];
        const navigatePreviousButton = document.querySelector('.navigate-previous');
        const navigateNextButton = document.querySelector('.navigate-next');

        if (!mainElement) {
            return;
        }

        /** @type {(which: typeof ALL_SCREENS[number]) => void} */
        const goToScreen = (which) => {
            bg_config.currentScreen = which;
            if (bg_config.currentScreen === ALL_SCREENS[0]) {
                navigatePreviousButton?.classList.remove('visible');
                navigatePreviousButton?.setAttribute('inert', 'inert');

                // Older browsers don't support inert:
                navigatePreviousButton?.setAttribute('aria-hidden', 'true');
                navigatePreviousButton?.setAttribute('tabindex', '-1');
            } else {
                navigatePreviousButton?.classList.add('visible');
                navigatePreviousButton?.removeAttribute('inert');

                // Older browsers don't support inert:
                navigatePreviousButton?.removeAttribute('aria-hidden');
                navigatePreviousButton?.removeAttribute('tabindex');
            }
            if (bg_config.currentScreen === ALL_SCREENS[ALL_SCREENS.length - 1]) {
                navigateNextButton?.classList.remove('visible');
                navigateNextButton?.setAttribute('inert', 'inert');

                // Older browsers don't support inert:
                navigateNextButton?.setAttribute('aria-hidden', 'true');
                navigateNextButton?.setAttribute('tabindex', '-1');
            } else {
                navigateNextButton?.classList.add('visible');
                navigateNextButton?.removeAttribute('inert');

                // Older browsers don't support inert:
                navigateNextButton?.removeAttribute('aria-hidden');
                navigateNextButton?.removeAttribute('tabindex');
            }

            let currentScreenIndex = ALL_SCREENS.indexOf(bg_config.currentScreen);
            document.documentElement.style.setProperty("--current-screen-index", currentScreenIndex);

            
            // Remove non-visible items from accessibility tree:

            for (let index = 0; index < mainElement.children.length; index++) {
                let elem = mainElement.children[index];

                // Purposeful loose comparison, index is a string
                if (index == currentScreenIndex) {
                    elem.id = "main"; // for skiplink
                    elem.removeAttribute('inert');

                    // Older browsers don't support inert:
                    elem.removeAttribute('aria-hidden');
                    elem.removeAttribute('tabindex');
                } else {
                    elem.removeAttribute('id');
                    elem.setAttribute('inert', 'inert');

                    // Older browsers don't support inert:
                    elem.setAttribute('aria-hidden', 'true');
                    elem.setAttribute('tabindex', '-1');
                }
            }
            if (navigationScrollItems) {
                for (let index = 0; index < navigationScrollItems.children.length; index++) {
                    let elem = navigationScrollItems.children[index];
    
                    // Purposeful loose comparison, index is a string
                    if (index == currentScreenIndex) {
                        elem.removeAttribute('inert');
    
                        // Older browsers don't support inert:
                        elem.removeAttribute('aria-hidden');
                        elem.removeAttribute('tabindex');
                    } else {
                        elem.setAttribute('inert', 'inert');
    
                        // Older browsers don't support inert:
                        elem.setAttribute('aria-hidden', 'true');
                        elem.setAttribute('tabindex', '-1');
                    }
                }
            }
        }

        if (!background.currentUserInfo?.logged_in) {
            bg_config.currentScreen = 'account';
        }
        goToScreen(bg_config.currentScreen);
        if (!background.currentUserInfo?.logged_in) {
            // do not allow user to leave account until logged in
            navigatePreviousButton.classList.remove('visible');
            navigatePreviousButton.setAttribute('inert', 'inert');

            // Older browsers don't support inert:
            navigatePreviousButton.setAttribute('aria-hidden', 'true');
            navigatePreviousButton.setAttribute('tabindex', '-1');
        } else {
            const nowPlayingTitle = document.querySelector('.now-playing-title');    
            if (nowPlayingTitle && background?.stationsByToken?.[background?.currentStationToken]?.stationName) {
                nowPlayingTitle.innerText = background.stationsByToken[background.currentStationToken].stationName;
            }
        }

        /** @type {(direction: 'previous' | 'next') => (() => void)} */
        const handleClickThunk = (direction) => {
            let effectiveDirection = 0;
            if (direction === 'previous') {
                effectiveDirection = -1;
            } else if (direction === 'next') {
                effectiveDirection = 1;
            }
            return () => {
                // Clamp to possible targets
                let targetScreenIndex = Math.max(
                    0,
                    Math.min(
                        ALL_SCREENS.length - 1,
                        ALL_SCREENS.indexOf(bg_config.currentScreen) + effectiveDirection
                    )
                )

                goToScreen(ALL_SCREENS[targetScreenIndex]);
            }
        }

        navigatePreviousButton.addEventListener('click', handleClickThunk('previous'));
        navigateNextButton.addEventListener('click', handleClickThunk('next'));

        return goToScreen;
    }
    
    /** @type {(track: unknown, thisButton: HTMLButtonElement, otherButton: HTMLButtonElement, positive: boolean) => void} */
    const processThumb = (track, thisButton, otherButton, positive) => {
        if (thisButton?.classList?.contains('working') || !track) {
            return;
        }

        thisButton.classList?.add('working');

        // otherButton also disabled to prevent race conditions wherein
        // thisButton is pressed, then while it's working otherButton is pressed.
        // now rating is in indeterminate state, depending on which request reached Pandora first.
        // so... avoid it by disabling both.
        otherButton?.classList?.add?.('working');


        if (
            (track.songRating === 1 && positive) ||
            (track.songRating === -1 && !positive)
        ) {
            // Want to remove feedback.

            // optimistic, but good in 99% of cases.
            thisButton.classList.remove('active');

            background?.deleteFeedback?.(track).then(ok => {
                thisButton.classList.remove('working');
                otherButton?.classList?.remove?.('working');

                if (!ok) {
                    // restore back ui from bad assumption of working network
                    thisButton.classList.add('active');
                }
            });
        } else {
            // Want to add feedback.

            let otherWasActive = otherButton?.classList?.contains?.('active');
            if (otherWasActive) {
                // optimistic, but good in 99% of cases.
                // no optional chaining here, as otherWasActive can only be truthy if otherButton exists
                otherButton.classList.remove('active');
            }
            background?.addFeedback?.(track, positive).then(ok => {
                thisButton.classList.remove('working');
                otherButton?.classList?.remove?.('working');

                if (ok) {
                    thisButton.classList.add('active');
                } else {
                    // restore ui from bad assumption of working network
                    if (otherWasActive) {
                        otherButton.classList.add('active');
                    }
                }
            });
        }
    }

    const goToScreen = initializeNavigation();

    /** @type (acctName: string) => string} */
    const getAccountImage = (acctName) => {
		return `https://www.pandora.com/static/user/default_images/user_default_${(acctName.toLowerCase().replace(/[^a-zA-Z]/g, '').substring(0, 1) || 'f')}_500x500.png`
    }


    const historyScreen = document.getElementsByClassName('history')[0];    
    const playerScreen = document.getElementsByClassName('player')[0];
    const stationsScreen = document.getElementsByClassName('stations')[0];
    const accountScreen = document.getElementsByClassName('account')[0];


    const updateHistory = (forceList = null) => {
        /** @type {HTMLTemplateElement | null} */
        const historyItemTemplate = document.querySelector('.history-item-template');
        const historyItemsList = historyScreen.querySelector('ul');

        let newHistoryElements = [];
        let usedList = forceList || background.prevSongs || [];
        for (let item of usedList) {
            const newHistoryItem = historyItemTemplate.content.children[0].cloneNode(true);
            let titleElement = newHistoryItem.querySelector('.title');
            let artistElement = newHistoryItem.querySelector('.artist');
            let coverElement = newHistoryItem.querySelector('.cover');
            let thumbsUpButton = newHistoryItem.querySelector('.thumbs-up');
            let downloadButton = newHistoryItem.querySelector('.download');
            let thumbsDownButton = newHistoryItem.querySelector('.thumbs-down');


            if (titleElement) {
                titleElement.innerText = item.songName;

                if (titleElement instanceof HTMLAnchorElement && item?.songDetailUrl) {
                    titleElement.href = processURL(item.songDetailUrl);
                }
            }
            if (artistElement) {
                artistElement.innerText = item.artistName;
            }

            coverElement.src = item.artBlobUrl || toHTTPS(item.albumArtUrl) || DEFAULT_ALBUM_IMAGE;

            if (item.songRating === 1) {
                thumbsUpButton?.classList.add('active');
            } else if (item.songRating === -1) {
                thumbsDownButton?.classList.add('active');
            }

			if (thumbsUpButton) {
				thumbsUpButton.disabled = !item.allowFeedback;
			}
			if (thumbsDownButton) {
				thumbsDownButton.disabled = !item.allowFeedback;
			}

            thumbsUpButton?.addEventListener('click', () => processThumb(item, thumbsUpButton, thumbsDownButton, true));
            newHistoryItem.querySelector('.play')?.addEventListener('click', () => background.replaySong?.(item, false))
            downloadButton?.addEventListener('click', () => {
                if (downloadButton.classList.contains('active')) {
                    return;
                }
                downloadButton.classList.add('active');
                
                background?.downloadRichSong?.(item).then(data => {
                    downloadButton.classList.remove('active');
                    setupDownload(data[0], data[1]);
                })
            })
            thumbsDownButton?.addEventListener('click', () => processThumb(item, thumbsDownButton, thumbsUpButton, false));


            newHistoryElements.push(newHistoryItem);
        }
        historyItemsList.replaceChildren(...newHistoryElements);
    }

    /** @type {HTMLInputElement} */
    const historySearchElement = historyScreen.querySelector('#history-search');
    historySearchElement?.addEventListener('input', (e) => {
        let value = e.currentTarget.value;

        if (value === "") {
            updateHistory(background?.prevSongs || []);
            return;
        }

        let filteredHistory = (/** @type {Array<unknown>} */(background?.prevSongs || []))
            .map(item => [item, fuzzyStringSearch(`${item.songName} ${item.artistName}`, value)])
            .sort((itemA, itemB) => (itemA[1] - itemB[1]))
            .filter(item => item[1] > 0.2)
            .map(item => item[0]);
        updateHistory(filteredHistory);
    });

	const recalculateInfoLine = () => {
        let infoLine = playerScreen.querySelector('.infoline');
        if (infoLine) {
            let contentWidthPX = getComputedStyle(infoLine.children[0]).width;
            let contentWidthNum = parseFloat(contentWidthPX.substring(0, contentWidthPX.length - 2));
            let parentWidthPX = getComputedStyle(infoLine).width;
            let parentWidthNum = parseFloat(parentWidthPX.substring(0, parentWidthPX.length - 2));

            let infolineScrollAmount = "0px";
            let infolineScrollDuration = 0;
            if (contentWidthNum > parentWidthNum) {
                infolineScrollAmount = `${parentWidthNum - contentWidthNum}px`;
                infolineScrollDuration = `${(contentWidthNum - parentWidthNum) / 50}s`;
            }

            infoLine.style.setProperty('--infoline-scroll-amount', infolineScrollAmount);
            infoLine.style.setProperty('--infoline-scroll-duration', infolineScrollDuration);
        }
	}
    
    const initPlayer = () => {
        if (!playerScreen) { return; }
        // Mostly listeners.

        let backgroundImageElement = document.querySelector('.background-blur');
        let playPauseButton = playerScreen.querySelector('.big');
        let skipNextButton = playerScreen.querySelector('.skip-next');

        let thumbsDownButton = playerScreen.querySelector('.thumbs-down');
        let thumbsUpButton = playerScreen.querySelector('.thumbs-up');
        let downloadButton = playerScreen.querySelector('.download');

        playerScreen.querySelector('.skip-previous')?.addEventListener('click', () => background?.seekBack?.());
        playerScreen.querySelector('.tired-of-song')?.addEventListener('click', () => background?.sleepSong?.());

        downloadButton?.addEventListener('click', () => {
            if (downloadButton.classList.contains('active')) {
                return;
            }
            downloadButton.classList.add('active');
            
            background?.downloadRichSong?.(background?.currentSong).then(data => {
                downloadButton.classList.remove('active');
                setupDownload(data[0], data[1]);
            })
        })

        backgroundImageElement?.addEventListener('load', () => {
            backgroundImageElement.classList.add('loaded');
        })
        
        playPauseButton?.addEventListener('click', () => {
            if (background.mp3Player?.paused) {
                background.play();
                playPauseButton.replaceChildren(getNewIconElem('pause'));
            } else {
                background.mp3Player?.pause?.();
                playPauseButton.replaceChildren(getNewIconElem('play'));
            }
        });

        thumbsDownButton.addEventListener('click', () => processThumb(background.currentSong, thumbsDownButton, thumbsUpButton, false));
        thumbsUpButton.addEventListener('click', () => processThumb(background.currentSong, thumbsUpButton, thumbsDownButton, true));
        skipNextButton.addEventListener('click', () => background.nextSong());

        /** @type {HTMLInputElement | null } */
        let seekBar = playerScreen.querySelector('.seekBar');
        seekBar?.addEventListener('input', (e) => {
            // Purposeful truthy here - "0" can mean unloaded
            if (background?.mp3Player?.currentTime) {
                background.mp3Player.currentTime = e.target.value;
            }
        })

        let volumeBar = playerScreen.querySelector('.volume');
        if (volumeBar && background.mp3Player && volumeBar instanceof HTMLInputElement) {
            volumeBar.value = background.mp3Player.volume * 100;
            let volPos = document.documentElement.style.getPropertyValue('--volume-bar-position');
            if (volPos === 'none') {
                volumeBar.parentElement.style.display = 'none';
                volumeBar.parentElement.parentElement.style.rowGap = '0';
            }
            if (volPos === 'left' || volPos === 'right') {
                volumeBar.parentElement.parentElement.style.padding = '0';
                volumeBar.parentElement.dataset.isVertical = true;
            }
            volumeBar.addEventListener('input', (e) => {
                if (background?.mp3Player) {
                    background.mp3Player.volume = (parseFloat(e.target.value) / 100);
                }
            })
        }
    }

    let trackAsOfPreviousUpdate = null;
    const updatePlayer = () => {
        if (!playerScreen) { return; }

        let currentTrack = background?.currentSong || {
            songName: "Nothing is currently playing.",
            artistName: "Choose a station to begin.",
            albumArtUrl: DEFAULT_ALBUM_IMAGE,
			allowFeedback: false,
            songRating: 0
        };

        let thumbsDownButton = playerScreen.querySelector('.thumbs-down');
        let thumbsUpButton = playerScreen.querySelector('.thumbs-up');

        if (currentTrack.songRating === 1) {
            thumbsDownButton.classList.remove('active');
            thumbsUpButton.classList.add('active');
        } else if (currentTrack.songRating === -1) {
            // This should never happen.
            // ... still, good to cover it anyways.
            thumbsDownButton.classList.add('active');
            thumbsUpButton.classList.remove('active');
        } else {
            thumbsDownButton.classList.remove('active');
            thumbsUpButton.classList.remove('active');
        }

		thumbsUpButton.disabled = !currentTrack.allowFeedback;
		thumbsDownButton.disabled = !currentTrack.allowFeedback;


        let playPauseButton = playerScreen.querySelector('.big');
        if (background.mp3Player?.paused) {
            playPauseButton.replaceChildren(getNewIconElem('play'));
        } else {
            playPauseButton.replaceChildren(getNewIconElem('pause'));
        }

        let seekBar = playerScreen.querySelector('.seekBar');
        if (seekBar && background?.mp3Player && (seekBar instanceof HTMLInputElement)) {
            seekBar.max = /** @type {HTMLAudioElement} */ (background.mp3Player).duration;
        }

        if (currentTrack === trackAsOfPreviousUpdate) {
            return;
        }

		const trackIsAdvertisement = !!currentTrack.clickThroughUrl;

		const sleepButton = playerScreen.querySelector('.tired-of-song');
		if (sleepButton) {
			sleepButton.disabled = trackIsAdvertisement;
		}


        const nowPlayingTitle = document.querySelector('.now-playing-title');    
        if (nowPlayingTitle && background?.stationsByToken?.[background?.currentStationToken]?.stationName) {
            nowPlayingTitle.innerText = background.stationsByToken[background.currentStationToken].stationName;
        }

        let coverElement = playerScreen.querySelector('.cover');
        let backgroundImageElement = document.querySelector('.background-blur');

        backgroundImageElement.classList.remove('loaded');
        coverElement.src = backgroundImageElement.src = currentTrack.artBlobUrl || toHTTPS(currentTrack.albumArtUrl) || DEFAULT_ALBUM_IMAGE;

        let titleElement = playerScreen.querySelector('.title');
        let artistElement = playerScreen.querySelector('.artist');
        titleElement.innerText = currentTrack.songName;
        artistElement.innerText = currentTrack.artistName;

		
		
		if (titleElement) {
			if (titleElement instanceof HTMLAnchorElement) {
				if (currentTrack.songDetailUrl ?? currentTrack.clickThroughUrl) {
					titleElement.href = processURL(currentTrack.songDetailUrl ?? currentTrack.clickThroughUrl);
				} else {
					titleElement.removeAttribute('href');
				}
			} else {
				if (trackIsAdvertisement) {
					let adLink = titleElement.querySelector('.ad-link');
					if (!adLink) {
						adLink = document.createElement('a');
						adLink.appendChild(getNewIconElem('link'))
					}
					adLink.href = currentTrack.clickThroughUrl;
					titleElement.appendChild(adLink);
				} else {
					if (titleElement.querySelector('.ad-link')) {
						titleElement.removeChild(titleElement.querySelector('.ad-link'))
					}
				}
			}
		}

        if (artistElement instanceof HTMLAnchorElement) {
			if (currentTrack.artistDetailUrl) {
				artistElement.href = processURL(currentTrack.artistDetailUrl);
			} else {
				artistElement.removeAttribute('href');
			}
        }

		let separatorElement = playerScreen.querySelector('.infoline-content .sep');
		if (separatorElement) {	
			if (currentTrack.songName && currentTrack.artistName) {
				separatorElement.style.display = '';
			} else {
				separatorElement.style.display = 'none';
			}
		}
		setTimeout(recalculateInfoLine, 10);


        trackAsOfPreviousUpdate = background?.currentSong || null;
    }

    const drawPlayer = () => {
        let seekBar = playerScreen.querySelector('.seekBar');
        if (seekBar && background?.mp3Player && (seekBar instanceof HTMLInputElement)) {
            seekBar.value = background.mp3Player.currentTime;
        }
        
        let volumeBar = playerScreen.querySelector('.volume');
        if (volumeBar && background?.mp3Player && (volumeBar instanceof HTMLInputElement)) {
            volumeBar.value = background.mp3Player.volume * 100;
        }
    }

    const initStations = () => {
        if (!stationsScreen) { return; }

        let refreshButton = stationsScreen.querySelector('.refresh');
        let stationsList = stationsScreen.querySelector('.stationsList');

        if (!stationsList) {
            // What's the point?
            return;
        }

        refreshButton?.addEventListener('click', () => {
            if (refreshButton.classList.contains('active')) { return; }

            refreshButton.classList.add('active');

            stationsList.replaceChildren(); // with nothing. clear the children.

            background?.refreshStationsList().then(({ ok }) => {
                refreshButton.classList.remove('active');

                if (ok) {
                    updateStations();
                }
            })
        })
    }

    const updateStations = (forceList = null) => {
        /** @type {HTMLTemplateElement | null} */
        const stationTemplate = document.querySelector('.station-template');

        if (!stationsScreen || !stationTemplate) { return; }

        const stationsListElement = stationsScreen.querySelector('.stationsList');
        let lastActiveStation = null;
        let newChildren = [];
        let usedList = forceList || background.stationsArray || [];
        for (let station of usedList) {
            const newStation = stationTemplate.content.children[0].cloneNode(true);
            newStation.querySelector('.title').innerText = station.stationName;
            let coverElement = newStation.querySelector('.cover');

            if (coverElement) {
                coverElement.src = station.artBlobUrl || station.artUrl || DEFAULT_ALBUM_IMAGE;
            }

            if (station.stationToken === background?.currentStationToken) {
                lastActiveStation = newStation;
                newStation.classList.add('active');
                if (document.querySelector('.now-playing-title')) {
                    document.querySelector('.now-playing-title').innerText = station.stationName;
                }
            }

            newStation.addEventListener('click', (e) => {
                e.preventDefault();
                lastActiveStation?.classList.remove('active');
                lastActiveStation = newStation;
                newStation.classList.add('active');
                if (document.querySelector('.now-playing-title')) {
                    document.querySelector('.now-playing-title').innerText = station.stationName;
                }

                background?.playStation?.(station.stationToken);
                goToScreen('playing');
                document.querySelector('.player .big').focus();
            })

            newChildren.push(newStation);
        }

        stationsListElement.replaceChildren(...newChildren);
    }

    /** @type {HTMLInputElement} */
    const stationsSearchElement = document.querySelector('#stations-search');
    stationsSearchElement?.addEventListener('input', (e) => {
        let value = e.currentTarget.value;

        if (value === "") {
            updateStations(background?.stationsArray || []);
            return;
        }

        let filteredStations = (/** @type {Array<unknown>} */(background?.stationsArray || []))
            .map(station => [station, fuzzyStringSearch(station.stationName, value)])
            .sort((stationA, stationB) => (stationA[1] < stationB[1]))
            .filter(station => station[1] > 0.2)
            .map(station => station[0]);
        updateStations(filteredStations);
    });

    const getNewIconElem = (/** @type {typeof ICONS[number]} */icon) => {
        let newIconTemplate = document.querySelector(`.${icon}-icon-template`);
        let newIcon = newIconTemplate.content.children[0].cloneNode(true);
        return newIcon;
    }

    const initAccount = () => {
        if (!accountScreen) { return; } 

        const versionText = accountScreen.querySelector('.version');

        if (versionText) {
            versionText.innerText = getAnesidoraVersion();
        }

        function showAccount() {
            if (!background.currentUserInfo.logged_in) {
                showLogin();
                return;
            }

            accountScreen.querySelector('section > .login')?.parentElement?.removeChild(accountScreen.querySelector('section > .login'));
            accountScreen.classList.remove('logged-out');
            accountScreen.classList.add('logged-in');
            let acctTemplate = document.querySelector('.account-template');
            let newAcct = acctTemplate.content.children[0].cloneNode(true);

            let avatar = newAcct.querySelector('.avatar');
            

            
            // Show current email and account image in account page.
            if (avatar) {
                avatar.src = getAccountImage(background.currentUserInfo.email);
            }
            newAcct.querySelector('.username').innerText = background.currentUserInfo.email;




            (newAcct.querySelector('button') || newAcct).addEventListener('click', () => {
                background?.userLogout?.();
                showLogin();
            });

            accountScreen.querySelector('.account-info-after-me').insertAdjacentElement('afterend', newAcct);
        }

        function showLogin() {
            // do not select template
            accountScreen.querySelector('section > .real-account')?.parentElement?.removeChild(accountScreen.querySelector('section > .real-account'));
            accountScreen.classList.remove('logged-in');
            accountScreen.classList.add('logged-out');

            /** @type {HTMLTemplateElement} */
            let loginTemplate = document.querySelector('.login-template');
            let loginForm = loginTemplate.content.children[0].cloneNode(true);

            /** @type {HTMLButtonElement} */
            let loginButton = loginForm.querySelector('.login-submit')
            let loginErrorContainer = loginForm.querySelector('.login-error-container');

            let adjacentElem = accountScreen.querySelector('.login-after-me') ?? accountScreen.querySelector('.login-template');
            adjacentElem?.insertAdjacentElement('afterend', loginForm);

            // When "login" is pressed,
            loginForm?.addEventListener('submit', (event) => {
                // Prevent the default behavior of reloading the page
                event.preventDefault();

                // If we're already in the process of logging in,
                // do nothing.
                if (loginButton.classList.contains('active')) {
                    return;
                }
                // Change the login button to reflect that we're doing something:
                loginButton.classList.add('active');
                loginButton.classList.remove('warning');
                if (loginButton.querySelector('.icon')) {
                    loginButton.replaceChild(
                        getNewIconElem('refresh'),
                        loginButton.querySelector('.icon')
                    );
                }

                // Get the contents of our username and password text boxes
                let formData = new FormData(loginForm);
                // Actually log in using the email and password from the text boxes
                background.userLogin(formData.get('email'), formData.get('password')).then(result => {
                    // OK, we've tried to log in. What's the result?

                    if (result.ok) {
                        // Good result! Switch to stations view and refresh stations
                        showAccount();
                        background?.refreshStationsList?.()?.then(() => {
                            updateStations();
                        })
                        goToScreen('stations');
                    } else {
                        // Bad result! Show the error message.
                        if (loginErrorContainer) {
                            loginErrorContainer.innerText = result.reason ?? '\n';
                        }

                        loginButton.classList.remove('active');
                        loginButton.classList.add('warning');
                        if (loginButton.querySelector('.icon')) {
                            loginButton.replaceChild(getNewIconElem('login'), loginButton.querySelector('.icon'));
                        }
                    }
                })
            });
        }

        if (background.currentUserInfo?.logged_in) {
            showAccount();
        } else {
            showLogin();
        }
    }

    initStations();

    if (background.currentUserInfo?.logged_in) {
        updateStations();
        background?.throttleRefreshStationsList?.().then?.(() => {
            if (stationsScreen && !stationsScreen.contains(document.activeElement)) {
                // If user is typing in the stations search bar or otherwise interacting
                // with the pane, don't shift it under them.

                updateStations();
            }
        })
    }

    initAccount();
    updateHistory();

    initPlayer();
    updatePlayer();

    
    const setupDownload = (url, filename) => {
        // Trim the title of the song to 15 characters.
        //Not a perfect solution, but there were issues with it at full length
        let a = document.createElement('a');
        a.href = url;
		if (filename) {
			a.download = filename
		}
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    background.setCallbacks(
        () => {
            updatePlayer();
            updateHistory();
        },
        drawPlayer,
        setupDownload
    )
})
