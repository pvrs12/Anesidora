/**
 * Map of localStorage:
 * - keyof DEFAULTS (all JSON, only through config proxy)
 * - "username", "password" (anesidora.js)
 * - "lastStation" (background.js)
 */
"use strict";

// Constants

// should not affect manual skips
const MIN_ERRORSKIP_DELAY = 1000;
const USE_PANDORA_DEFAULT_ALBUM_IMAGE = false;

const DEFAULT_ALBUM_IMAGE = (
    USE_PANDORA_DEFAULT_ALBUM_IMAGE ? 
        'https://web-cdn.pandora.com/web-client-assets/images/album_500.7d4c7506560849c0a606b93e9f06de71.png' :
        './images/default_cover.svg'
);


const ALL_SCREENS = /** @type {const} */ (['history', 'playing', 'stations', 'account']);

const background = get_browser().extension.getBackgroundPage();
// This is var because common.js is also loaded by background.js
// so if it were a let or const it would not allow redeclaration
/** @type {typeof DEFAULTS} */
var bg_config = background.config;

// Utility functions

const toHTTPS = (url) => {
    if (!url) { return url; }
    if (bg_config.httpsOnlyAssets) {
        return url.replace('http://', 'https://');
    }
    return url;
}

const removeQueryString = (url) => {
	if (!url) { return url; }
	if (bg_config.stripTrackingParams) {
		return url.split('?')[0];
	}
	return url;
}

const processURL = (url) => {
	return toHTTPS(removeQueryString(url));
}


// Preset loading / default reading

const debounceFunction = (cb, delay = 2000) => {
	let lastTimeoutId = null;
    return () => {
		if (lastTimeoutId) {
			window.clearTimeout(lastTimeoutId);
		}
		lastTimeoutId = window.setTimeout(() => {
			cb();
		}, delay)
    }
}

const getPreset = (preset = bg_config.selectedPreset) => {
    return bg_config.presets.find(e => e.id === preset);
}

const getEffectivePreset = () => {
    return bg_config.selectedPreset === 'match' ? getMatchPreset() : getPreset();
}

/**
 * @type {<K extends keyof typeof DEFAULTS.playerPreferences[keyof typeof DEFAULTS.playerPreferences]>(key: K, preset: typeof DEFAULTS.presets[number]) => typeof DEFAULTS.playerPreferences[keyof typeof DEFAULTS.playerPreferences][K]}
 */
const getPresetMetaVariable = (key, preset = getEffectivePreset()) => {
	if (preset[key]) {
		return preset[key];
	}
	return background.DEFAULTS.playerPreferences[preset.playerType ?? background.DEFAULTS.presets[background.DEFAULTS.selectedPreset].playerType][key];
}

/** @returns {{ light: string, dark: string }} */
function getSelectedMatchPresets() {
	let selectedMatchPresets = bg_config.selectedMatchPresets;
    let presets = bg_config.presets;

	for (let matchType of ['light', 'dark']) {
		if (!selectedMatchPresets[matchType]) {
			let typeCandidate = presets.find(e => e.cssVariables['color-scheme-type'] === matchType);

            if (typeCandidate) {
                selectedMatchPresets[matchType] = typeCandidate.id;
                continue;
            }

            let presetFromDefaults = background.DEFAULTS.presets.find(e => e.cssVariables['color-scheme-type'] === matchType);
            presets.push(presetFromDefaults);
            selectedMatchPresets[matchType] = presetFromDefaults.id;
		}
	}

	return selectedMatchPresets;
}

function getMatchPreset(colorScheme) {
	if (colorScheme !== 'light' && colorScheme !== 'dark') {
		let prefersLight = matchMedia(`(prefers-color-scheme: light)`);
		colorScheme = (background.prefersLightMedia?.matches ?? prefersLight.matches) ? 'light' : 'dark';
	}

	return getPreset(getSelectedMatchPresets()[colorScheme]);
}

// Migrate from old version, best as possible.
// Most things do not map 1-to-1.
if (localStorage.getItem('bodyWidth') || localStorage.getItem('bodyHeight') || localStorage.getItem('themeInfo')) {

    if (localStorage.getItem('themeInfo')) {
        const oldPresetInfo = JSON.parse(localStorage.getItem('themeInfo'));
        // start with default for that type
    	const presets = bg_config.presets;
        // structuredClone, but works on proxies
        const newPreset = JSON.parse(JSON.stringify(getEffectivePreset()));
        newPreset.name = "Migrated";
        newPreset.id = "migrated";
        
        if (localStorage.getItem('bodyWidth')) {
            newPreset.cssVariables['viewport-width'] = localStorage.getItem('bodyWidth') + 'px';
            localStorage.removeItem('bodyWidth');
        }
        if (localStorage.getItem('bodyHeight')) {
            newPreset.cssVariables['viewport-height'] = localStorage.getItem('bodyHeight') + 'px';
            localStorage.removeItem('bodyHeight');
        }
        newPreset.cssVariables['background-color'] = oldPresetInfo.background;
        newPreset.cssVariables['font-family'] = oldPresetInfo['font-family'];
        newPreset.cssVariables['font-size'] = oldPresetInfo['font-size'];
        newPreset.cssVariables['text-color'] = oldPresetInfo['text-color'];
        // Not overly concerned about --inverse-color, as it was _only_ used in the login button.
        newPreset.cssVariables['tab-navigation-icon-size'] = oldPresetInfo.tabSize;
        newPreset.cssVariables['icon-default-stroke'] = oldPresetInfo['button-color'];
        newPreset.cssVariables['icon-active-stroke'] = oldPresetInfo['active-button-color'];

        presets.push(newPreset);

        localStorage.removeItem('themeInfo');
    }
}

function updateCSSVariables(forceKey) {
    let preset = getEffectivePreset();

    if (forceKey) {
        document.documentElement.style.setProperty("--" + forceKey, preset.cssVariables[forceKey]);
    } else {
        for (let key in preset.cssVariables) {
            document.documentElement.style.setProperty("--" + key, preset.cssVariables[key]);
        }
    }
}

let customStyleElement = null;
function updateCustomCSS() {
    let allowCustomCSS = !window.location.pathname.includes('options');

    let newStyles = '';
    if (allowCustomCSS) {
        newStyles = getEffectivePreset().customCSS || '';
    }

    let styleElement;
    if (customStyleElement) {
        styleElement = customStyleElement;
    } else {
        styleElement = customStyleElement = document.createElement('style');
        styleElement.setAttribute('type', 'text/css');
        document.head.appendChild(styleElement);
    }
    styleElement.replaceChildren(document.createTextNode(newStyles));
}

function subscribeToUpdateCustomCSS() {
    let prefersLight = background.prefersLightMedia;

    prefersLight?.addEventListener?.('change', () => {    
        updateCSSVariables();
        updateCustomCSS();
    });
}

subscribeToUpdateCustomCSS();
updateCSSVariables();
updateCustomCSS();

const getAnesidoraVersion = () => {
	if (window.chrome && chrome.runtime && chrome.runtime.id) {
		return 'v' + window.chrome.runtime.getManifest().version;
	}
}