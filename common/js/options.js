/*globals alert, get_browser*/

var min_width = 310;
var min_height = 50;
var min_history = 1;

var default_width = 350;
var default_height = 100;
var default_history = 5;

var refresh_button;
var default_button;
var logout_button;
var save_button;
var preview;
var form;
var forceSecure;
var httpWarning_label;

var bodyWidth;
var bodyHeight;
var historyNum;
var bodyWidthNum = min_width;
var bodyHeightNum = min_height;

function secureWarning() {
    if (forceSecure.checked) {
        httpWarning_label.style.opacity = 0;
    } else {
        httpWarning_label.style.opacity = 1;
    }
}

function initBodySize() {
    "use strict";
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = default_width;
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = default_height;
    }
    if (localStorage.historyNum === undefined || localStorage.historyNum === 0) {
        localStorage.historyNum = default_history;
    }
    if (localStorage.forceSecure === undefined) {
        localStorage.forceSecure = true;
    }

    bodyWidth.value = localStorage.bodyWidth;
    preview.style.width = localStorage.bodyWidth + "px";
    preview.style.height = localStorage.bodyHeight + "px";
    bodyHeight.value = localStorage.bodyHeight;
    historyNum.value = localStorage.historyNum;

    forceSecure.checked = localStorage.forceSecure !== "false" && localStorage.forceSecure;
    secureWarning();
}

function initHotkeys() {
    get_browser().commands.getAll().then(commands => {
        commands.forEach(command => {
            playPauseHotkey = document.getElementById("playPauseHotkey");
            skipSongHotkey = document.getElementById("skipSongHotkey");
            
            if (playPauseHotkey && command.name === "pause_play") {
                playPauseHotkey.value = command.shortcut;
            }
            if (skipSongHotkey && command.name === "skip_song") {
                skipSongHotkey.value = command.shortcut;
            }
        });
    });
}

function updateHotkeys() {
    playPauseHotkey = document.getElementById("playPauseHotkey");
    skipSongHotkey = document.getElementById("skipSongHotkey");

    playPauseDetails = {
        name: "pause_play",
        shortcut: playPauseHotkey.value
    };
    get_browser().commands.update(playPauseDetails).catch(() => {
        alert("The Play/Pause hotkey entered is invalid!")
    });

    skipSongDetails = {
        name: "skip_song",
        shortcut: skipSongHotkey.value
    };
    get_browser().commands.update(skipSongDetails).catch(() => {
        alert("The Skip Song hotkey entered is invalid!")
    });;
}

document.addEventListener("DOMContentLoaded", function() {
    "use strict";

    refresh_button = document.getElementById("refresh");
    logout_button = document.getElementById("logout");
    default_button = document.getElementById("default");
    save_button = document.getElementById("save");
	preview = document.getElementById("preview");
    forceSecure = document.getElementById("forceSecure");
    httpWarning_label = document.getElementById("httpWarning");

    bodyWidth = document.getElementById("bodyWidth");
    bodyHeight = document.getElementById("bodyHeight");
    historyNum = document.getElementById("historyNum");

    initHotkeys();
    initBodySize();

    if (!forceSecure) {
        // only run the following when on options.htm
        return;
    }
	
	function handleSizeChange() {
		if (bodyHeight) {
			preview.style.height = bodyHeight.value + "px";
		}
		if (bodyWidth) {
			preview.style.width = bodyWidth.value + "px";
		}
	}
	if (bodyWidth) {
		bodyWidth.addEventListener('input', handleSizeChange);
	}
	if (bodyHeight) {
		bodyHeight.addEventListener('input', handleSizeChange);
		bodyHeight.addEventListener('input', heightStuff);
	}
	
	form = document.querySelector('form');
	let putBackTimeout;
	function heightStuff() {
		if (form) {
			if (putBackTimeout) {
				clearTimeout(putBackTimeout);
			}
			var posx = form.getBoundingClientRect().x,
				posy = form.getBoundingClientRect().y;
			document.body.style.minHeight = getComputedStyle(document.body).height;
			form.style.position = "absolute";
			form.style.zIndex = 2;
			form.style.top = posy + window.pageYOffset + "px";
			form.style.left = posx + window.pageXOffset + "px";	
			function putBack() {
				form.style.position = "",
				form.style.zIndex = "",
				form.style.top = "",
				form.style.left = "",
				document.body.style.height = "";
			}
			putBackTimeout = setTimeout(putBack, 100);
		}			
	}
	
    forceSecure.addEventListener("change", secureWarning);
    refresh_button.addEventListener("click", function () {
        get_browser().extension.getBackgroundPage().getStationList();
    });
    default_button.addEventListener("click", function () {
        localStorage.bodyWidth = default_width;
        localStorage.bodyHeight = default_height;
        localStorage.historyNum = default_history;
        localStorage.forceSecure = true;
    
        bodyWidth.value = localStorage.bodyWidth;
        bodyHeight.value = localStorage.bodyHeight;
        historyNum.value = localStorage.historyNum;
        forceSecure.checked = localStorage.forceSecure;
        handleSizeChange();
    });
    logout_button.addEventListener("click", function () {
        localStorage.username = "";
        localStorage.password = "";
        localStorage.lastStation = "";
    });

    save_button.addEventListener("click", function () {
    	var msg = "";
        if (bodyWidth.value < min_width) {
            localStorage.bodyWidth = min_width;
            msg += ("Player width must be greater than or equal to " + min_width + ".\n");
            bodyWidth.value = min_width;
        } else {
            localStorage.bodyWidth = bodyWidth.value;
        }
        if (bodyHeight.value < min_height) {
            localStorage.bodyHeight = min_height;
            msg += ("Player height must be greater than or equal to " + min_height + ".\n");
            bodyHeight = min_height;
        } else {
            localStorage.bodyHeight = bodyHeight.value;
        }
        if (historyNum.value < min_history) {
            localStorage.historyNum = min_history;
            msg += ("You must have at least " + min_history + " item" + ((min_history>1)?"s":"") + " in your history.\n");
            historyNum.value = min_history;
        } else {
            localStorage.historyNum = historyNum.value;
        }
        if (msg) {
        	alert(msg);
		}
		
        updateHotkeys();

        localStorage.forceSecure = forceSecure.checked;
    });
});
