// Loaded ONLY from background!
// Get references through getBackgroundPage
// if there are multiple instances of this, there WILL BE PROBLEMS
"use strict";

var DEFAULTS = /** @type {const} */ ({
	skipAfterDislike: true,
	playAds: false,
	registerAds: false,
	pauseAfterInactivity: true,
	tagDownloads: true,
	renameDownloads: true,
	limitFilenameLength: true,
	downloadNameFormatString: '%artistname% - %trackname%.mp4',
	inactivityDuration: 30,
    doRewinds: true,
    rewindDuration: 5,
	httpsOnlyAssets: true,
	stripTrackingParams: true,
    cacheAlbumArt: true,
	selectedPreset: 'match',
	selectedMatchPresets: {
		dark: 'cozy-dark',
		light: 'cozy-light'
	},
	currentScreen: 'account',
	playerPreferences: {
		// Used only when preset.cssVariables[key] or preset[key] is unset
		// sometimes used when switching playerTypes on 'match'
		cozy: {
			maxHistoryEntries: 20,
			'viewport-width': '350px',
			'viewport-height': '450px',
		},
		compact: {
			maxHistoryEntries: 10,
			'viewport-width': '450px',
			'viewport-height': '100px',
		},
	},
    presets: [
        {
          id: "match",
          name: "System",
          playerType: "match",
          customCSS: "",
          cssVariables: {}
        },
        {
          id: "cozy-dark",
          name: "Cozy Dark",
          playerType: "cozy",
          customCSS: "",
          cssVariables: {
            "tab-navigation-background-color": "#151515",
            "tab-navigation-text-color": "#FFFFFF",
            "tab-navigation-icon-size": "30px",
            "background-color": "#0F0F0F",
            "text-color": "#FFFFFF",
            "album-background-strength": "0.2",
            "album-background-saturation": "4",
            "album-background-blur-size": "calc(0.15 * var(--viewport-width))",
            "icon-default-fill": "rgba(0, 0, 0, 0)",
            "icon-default-stroke": "#C5C5C5",
            "icon-active-fill": "var(--icon-default-fill)",
            "icon-active-stroke": "#FFAE00",
            "icon-hover-fill": "var(--icon-default-fill)",
            "icon-hover-stroke": "var(--text-color)",
            "history-icon-size": "18px",
            "alternating-row-background": "rgba(128, 128, 128, 0.1)",
            "player-cover-max-size": "0.7",
            "player-cover-corner-radius": "15px",
            "player-play-icon-stroke": "var(--text-color)",
            "player-play-icon-fill": "#000000",
            "player-main-icon-size": "40px",
            "player-icon-size": "32px",
            "player-main-icons-stroke": "var(--text-color)",
            "player-main-icons-fill": "var(--icon-default-fill)",
            "player-small-icon-size": "18px",
            "player-minor-icons-stroke": "#C5C5C5",
            "player-minor-icons-fill": "var(--icon-default-fill)",
            "seek-bar-color": "var(--icon-default-stroke)",
            "volume-bar-color": "var(--icon-default-stroke)",
            "volume-bar-position": "none",
            "volume-bar-size": "0.9",
            "seek-bar-size": "0.9",
            "stations-play-background-color": "rgba(0, 0, 0, 0.5)",
            "stations-active-station-background": "rgba(255, 157, 0, 0.1)",
            "stations-active-station-color": "#ffffff",
            "font-family": "InterVariable, Arial, system-ui, sans-serif",
            "font-size": "16px",
            "color-scheme-type": "dark",
            "viewport-width": "325px",
            "viewport-height": "450px"
          },
          maxHistoryEntries: 20
        },
        {
          id: "cozy-light",
          name: "Cozy Light",
          playerType: "cozy",
          customCSS: "",
          cssVariables: {
            "tab-navigation-background-color": "#FFFFFF",
            "tab-navigation-text-color": "#242424",
            "tab-navigation-icon-size": "45px",
            "background-color": "#e5eaf0",
            "text-color": "#000000",
            "album-background-strength": "0.2",
            "album-background-saturation": "4",
            "album-background-blur-size": "calc(0.15 * var(--viewport-width))",
            "icon-default-fill": "#fcfcfd",
            "icon-default-stroke": "#384048",
            "icon-active-fill": "var(--icon-default-fill)",
            "icon-active-stroke": "#ee852b",
            "icon-hover-fill": "var(--icon-default-fill)",
            "icon-hover-stroke": "var(--icon-active-stroke)",
            "history-icon-size": "17px",
            "alternating-row-background": "rgba(128, 128, 128, 0.1)",
            "player-cover-max-size": "0.7",
            "player-cover-corner-radius": "15px",
            "player-play-icon-stroke": "var(--icon-default-stroke)",
            "player-play-icon-fill": "var(--icon-default-fill)",
            "player-main-icon-size": "40px",
            "player-icon-size": "32px",
            "player-main-icons-stroke": "var(--icon-default-stroke)",
            "player-main-icons-fill": "var(--icon-default-fill)",
            "player-small-icon-size": "18px",
            "player-minor-icons-stroke": "var(--icon-default-stroke)",
            "player-minor-icons-fill": "var(--icon-default-fill)",
            "seek-bar-color": "var(--icon-default-stroke)",
            "volume-bar-color": "var(--icon-default-stroke)",
            "volume-bar-position": "none",
            "volume-bar-size": "0.9",
            "seek-bar-size": "0.9",
            "stations-play-background-color": "rgba(0, 0, 0, 0.5)",
            "stations-active-station-background": "#4a90d9",
            "stations-active-station-color": "#ffffff",
            "font-family": "InterVariable, Arial, system-ui, sans-serif",
            "font-size": "16px",
            "color-scheme-type": "light",
            "viewport-width": "325px",
            "viewport-height": "450px"
          },
          maxHistoryEntries: 20
        },
        {
          id: "compact-dark",
          name: "Compact Dark",
          playerType: "compact",
          customCSS: ".cover {\n  border-color: color-mix(in srgb, var(--text-color) 50%, transparent 50%);\n}\nsvg.icon.anesidora-thumbs-up .check {\n  fill: #095EFF;\\n}",
          cssVariables: {
            "tab-navigation-background-color": "var(--icon-default-fill)",
            "tab-navigation-text-color": "var(--icon-default-stroke)",
            "tab-navigation-icon-size": "45px",
            "background-color": "#0F0F0F",
            "text-color": "#FFFFFF",
            "album-background-strength": "0.1",
            "album-background-saturation": "4",
            "album-background-blur-size": "calc(0.15 * var(--viewport-width))",
            "icon-default-fill": "#FCFCFD00",
            "icon-default-stroke": "#F0F8FF",
            "icon-active-fill": "#FCFCFD00",
            "icon-active-stroke": "#ee852b",
            "icon-hover-fill": "#FCFCFD00",
            "icon-hover-stroke": "#ee852b",
            "history-icon-size": "17px",
            "alternating-row-background": "rgba(128,128,128,0.04)",
            "player-cover-max-size": "0.8",
            "player-cover-corner-radius": "4px",
            "player-play-icon-stroke": "var(--player-main-icons-stroke)",
            "player-play-icon-fill": "var(--player-main-icons-fill)",
            "player-main-icon-size": "17px",
            "player-icon-size": "17px",
            "player-main-icons-stroke": "var(--icon-default-stroke)",
            "player-main-icons-fill": "var(--icon-default-fill)",
            "player-small-icon-size": "17px",
            "player-minor-icons-stroke": "var(--player-main-icons-stroke)",
            "player-minor-icons-fill": "var(--player-main-icons-fill)",
            "seek-bar-color": "var(--icon-default-stroke)",
            "volume-bar-color": "var(--icon-default-stroke)",
            "volume-bar-position": "right",
            "volume-bar-size": "0.9",
            "seek-bar-size": "0.95",
            "stations-play-background-color": "rgba(0, 0, 0, 0.5)",
            "stations-active-station-background": "#A3B3FF",
            "stations-active-station-color": "#000000",
            "font-family": "Arial, system-ui, sans-serif",
            "font-size": "14px",
            "color-scheme-type": "dark",
            "viewport-width": "450px",
            "viewport-height": "100px"
          },
          maxHistoryEntries: 10
        },
        {
          id: "compact-light",
          name: "Compact Light",
          playerType: "compact",
          customCSS: "",
          cssVariables: {
            "tab-navigation-background-color": "var(--icon-default-fill)",
            "tab-navigation-text-color": "var(--icon-default-stroke)",
            "tab-navigation-icon-size": "45px",
            "background-color": "#eff2f6",
            "text-color": "#000000",
            "album-background-strength": "0.1",
            "album-background-saturation": "4",
            "album-background-blur-size": "calc(0.15 * var(--viewport-width))",
            "icon-default-fill": "#fcfcfd",
            "icon-default-stroke": "#8397aa",
            "icon-active-fill": "#fcfcfd",
            "icon-active-stroke": "#ee852b",
            "icon-hover-fill": "#fcfcfd",
            "icon-hover-stroke": "#ee852b",
            "history-icon-size": "17px",
            "alternating-row-background": "rgba(128, 128, 128, 0.1)",
            "player-cover-max-size": "0.8",
            "player-cover-corner-radius": "4px",
            "player-play-icon-stroke": "#8397aa",
            "player-play-icon-fill": "#ffffff",
            "player-main-icon-size": "17px",
            "player-icon-size": "17px",
            "player-main-icons-stroke": "#8397aa",
            "player-main-icons-fill": "#fcfcfd",
            "player-small-icon-size": "17px",
            "player-minor-icons-stroke": "#8397aa",
            "player-minor-icons-fill": "#fcfcfd",
            "seek-bar-color": "var(--icon-default-stroke)",
            "volume-bar-color": "var(--icon-default-stroke)",
            "volume-bar-position": "right",
            "volume-bar-size": "0.9",
            "seek-bar-size": "0.95",
            "stations-play-background-color": "rgba(0, 0, 0, 0.5)",
            "stations-active-station-background": "#4a90d9",
            "stations-active-station-color": "#ffffff",
            "font-family": "Arial, system-ui, sans-serif",
            "font-size": "14px",
            "color-scheme-type": "light",
            "viewport-width": "450px",
            "viewport-height": "100px"
          },
          maxHistoryEntries: 10
        }
      ]
});

if (localStorage.getItem('playerType') && !(/['"]/.test(localStorage.getItem('playerType')[0]))) {
    // Migrate non-json string to json string
    localStorage.setItem('playerType', JSON.stringify(localStorage.getItem('playerType')));
}

var config = (() => {
    const SAVE_MIN_DELAY = 300;
    const USED_STORAGE = localStorage;
    const IS_PROXIED_SYMBOL = Symbol("isAnesidoraProxiedObject");
    
    const cache = {};
    let saveTimeouts = {};
    
    function deferredSave(key) {
        if (saveTimeouts[key] !== undefined) {
            window.clearTimeout(saveTimeouts[key]);
        }
        saveTimeouts[key] = window.setTimeout(() => {
            if (cache[key] !== undefined) {
                console.group('SERIALIZING SAVE');
                console.log(key, cache[key]);
                USED_STORAGE.setItem(key, JSON.stringify(cache[key]));
                console.groupEnd();
            } else {
                USED_STORAGE.removeItem(key);
            }
        }, SAVE_MIN_DELAY)
    }

    function constructProxy(target, baseKey) {
        for (let key in target) {
            if (typeof target[key] === 'object') {
                target[key] = constructProxy(target[key], baseKey);
            }
        }
        return new Proxy(target, {
            get(target, key) {
                if (key === IS_PROXIED_SYMBOL) {
                    return true;
                }
                return target[key];
            },
            set(target, key, value) {
                let proxiedValue = value;
                if (typeof proxiedValue === 'object' && !proxiedValue[IS_PROXIED_SYMBOL]) {
                    proxiedValue = constructProxy(value, baseKey);
                }
                target[key] = proxiedValue;
                deferredSave(baseKey);
                return true;
            },
            deleteProperty(target, key) {
                delete target[key];
                deferredSave(baseKey);
                return true;
            }
        })
    }


    return new Proxy(DEFAULTS, {
        get(_, key) {
            if (key === IS_PROXIED_SYMBOL) {
                return true;
            }

            let cachedValue = null;
            // Check cache
            if (Object.hasOwn(cache, key)) {
                return cache[key];
            }

            // If there's nothing in cache,
            // check storage

            let storedValue = USED_STORAGE.getItem(key);
            let parsedValue = null;
            if (!(storedValue === null || storedValue === undefined)) {
                // Storage has something!
                // Parse it.
                try {
                    parsedValue = JSON.parse(storedValue);
                } catch(e) {
                    console.error('storage value is invalid JSON: ', key, storedValue);
                    USED_STORAGE.removeItem(key);


                    // Invalid item in storage
                    // check defaults
                    if (Object.hasOwn(DEFAULTS, key)) {
                        parsedValue = DEFAULTS[key];
                    } else {
                        cache[key] = storedValue;
                        return storedValue;
                    }
                }
            } else {
                // If there's nothing in storage,
                // check defaults
                if (Object.hasOwn(DEFAULTS, key)) {
                    parsedValue = DEFAULTS[key];
                } else {
                    cache[key] = storedValue;
                    return storedValue;
                }
            }

            // Proxy any nested objects so we know when they're modified
            if (typeof parsedValue === 'object') {
                cachedValue = constructProxy(parsedValue, key);
            } else {
                cachedValue = parsedValue;
            }
            cache[key] = cachedValue;
            return cachedValue;
        },
        set(_, key, value) {
            let newValue = value;
            if (typeof newValue === 'object' && !newValue[IS_PROXIED_SYMBOL]) {
                newValue = constructProxy(value, key);
            }
            cache[key] = newValue;
            deferredSave(key);
            return true;
        },
        deleteProperty(_, key) {
            delete cache[key];
            deferredSave(key);
            return true;
        }
    });
})();