/*globals alert, get_browser*/

var minimums = {
    width: {
        'new': 160,
        'old': 310
    },
    height: {
        'new': 230,
        'old': 50
    },
    history: {
        'new': 1,
        'old': 1
    }
}
var defaults = {
    player: 'new',
    width: {
        'new': 350,
        'old': 350
    },
    height: {
        'new': 450,
        'old': 100
    },
    history: {
        'new': 20,
        'old': 10
    }
}

var style;
var refresh_button;
var default_button;
var logout_button;
var save_button;
var form;
var forceSecure;
var httpWarning_label;
var bodyWidth;
var bodyHeight;
var historyNum;
var bodyWidthNum = (localStorage.width==undefined?(localStorage.whichPlayer==undefined?defaults.width[defaults.player]:defaults.width[localStorage.whichPlayer]):localStorage.width);
// if localstorage doesn't have it, get it from defaults according to localstorage.whichPlayer
// if localStorage.whichPlayer _also_ doesn't exists, get it from defaults according to default player
var bodyHeightNum = (localStorage.height==undefined?(localStorage.whichPlayer==undefined?defaults.height[defaults.player]:defaults.width[localStorage.whichPlayer]):localStorage.height);

if (localStorage.themeInfo == undefined) {
    localStorage.themeInfo = JSON.stringify({
        'background': '#3a3a3a',
        'font-family': 'Verdana, Arial, sans-serif',
        'font-size': '12px',
        'text-color': '#FFFFFF',
        'inverse-color': '#000000',
        'accent-color': '#00f782',
        'accent-color-darker': '#00ae5c',
        'tabSize': '20px',
        'warning-bgcolor': '#ff3722',
        'warning-color': '#FFFFFF',
        'album-bg': '#86aaae',
        'button-color': '#ffffff',
        'active-button-color': '#ffa700',
        'album-color': '#000000'
    });
}

function secureWarning() {
    if (forceSecure.checked) {
        httpWarning_label.style.opacity = 0;
    } else {
        httpWarning_label.style.opacity = 1;
    }
}

function initBodySize() {
    "use strict";
    if (localStorage.whichPlayer === undefined) {
        localStorage.whichPlayer = defaults.player;
    }
    // for convenience,
    var whichPlayer = localStorage.whichPlayer;
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = defaults.width[whichPlayer];
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = defaults.height[whichPlayer];
    }
    if (localStorage.historyNum === undefined || localStorage.historyNum === 0) {
        localStorage.historyNum = defaults.history[whichPlayer];
    }
    if (localStorage.forceSecure === undefined) {
        localStorage.forceSecure = true;
    }
    document.documentElement.style.setProperty('--height', localStorage.bodyHeight +'px');
    document.documentElement.style.setProperty('--width', localStorage.bodyWidth+'px');

    if (!forceSecure) {
        return; // alright that's enough
    }    
    bodyWidth.value = localStorage.bodyWidth;
    bodyHeight.value = localStorage.bodyHeight;
    historyNum.value = localStorage.historyNum;
    if (localStorage.whichPlayer == 'new') {
        document.getElementById('preview').style.opacity = 1;
        document.getElementById('preview2').style.opacity = 0;
    } else {
        document.getElementById('preview').style.opacity = 0;
        document.getElementById('preview2').style.opacity = 1;
    }
    style.value = localStorage.whichPlayer;
    document.getElementById('theming').addEventListener('click', (e) => {
        e.preventDefault();
        window.location = "theming.htm";
        return false;
    });
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
    forceSecure = document.getElementById("forceSecure");
    httpWarning_label = document.getElementById("httpWarning");

    style = document.getElementById("playerStyle");
    bodyWidth = document.getElementById("bodyWidth");
    bodyHeight = document.getElementById("bodyHeight");
    historyNum = document.getElementById("historyNum");

    initHotkeys();
    initBodySize();

    if (!forceSecure) {
        // only run the following when on options.htm
        return;
    }
    
    if (bodyWidth) {
        bodyWidth.addEventListener('input', heightStuff);
    }
    if (bodyHeight) {
        bodyHeight.addEventListener('input', heightStuff);
    }
    if (style) {
        style.addEventListener('change', () => {
            if (style.value != 'new' && style.value != 'old') return;
            if (style.value == 'new') {
                document.getElementById('preview').style.opacity = 1;
                document.getElementById('preview2').style.opacity = 0;
            } else {
                document.getElementById('preview').style.opacity = 0;
                document.getElementById('preview2').style.opacity = 1;
            }
            bodyHeight.value = defaults.height[style.value];
            bodyWidth.value = defaults.width[style.value];
            heightStuff(); // change sizes to minimums, if needed
        });
    }
    
    form = document.querySelector('form');
    let putBackTimeout;
    function heightStuff() {
        if (form) {
            if (putBackTimeout) {
                clearTimeout(putBackTimeout);
            }
            let effHeight = bodyHeight.value; // effective width & height
            let effWidth = bodyWidth.value;
            if (bodyHeight.value < minimums.height[style.value]) {
                effHeight = minimums.height[style.value];
            }
            if (bodyWidth.value < minimums.width[style.value]) {
                effWidth = minimums.width[style.value];
            }
            console.log('Got to this point');
            var posx = form.getBoundingClientRect().x,
                posy = form.getBoundingClientRect().y;
            document.body.style.minHeight = getComputedStyle(document.body).height;
            form.style.position = "absolute";
            form.style.zIndex = 2;
            form.style.top = posy + window.pageYOffset + "px";
            form.style.left = posx + window.pageXOffset + "px";    
            document.documentElement.style.setProperty('--height', effHeight +'px');
            document.documentElement.style.setProperty('--width', effWidth+'px');
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
        // for convenience,
        var whichPlayer = style.value;
        localStorage.bodyWidth = defaults.width[whichPlayer];
        localStorage.bodyHeight = defaults.height[whichPlayer];
        localStorage.historyNum = defaults.history[whichPlayer];
        localStorage.forceSecure = true;
        
           document.documentElement.style.setProperty('--height', defaults.height[whichPlayer] +'px');
        document.documentElement.style.setProperty('--width', defaults.width[whichPlayer]+'px');

        bodyWidth.value = localStorage.bodyWidth;
        bodyHeight.value = localStorage.bodyHeight;
        historyNum.value = localStorage.historyNum;
        forceSecure.checked = localStorage.forceSecure;
    });
    logout_button.addEventListener("click", function () {
        localStorage.username = "";
        localStorage.password = "";
        localStorage.lastStation = "";
    });


    save_button.addEventListener("click", function (e) {
        var msg = "";

        if (style && (style.value == "new" || style.value == "old")) {
            localStorage.whichPlayer = style.value;
        } else {
            alert("How did you even get here?");
            e.preventDefault(e);
            return false;
        }        
        // I keep writing this, but _for convenience_,
        var player = style.value;
        var min_width = minimums.width[player];
        var min_height = minimums.height[player];
        var min_history = minimums.history[player];
        
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
            bodyHeight.value = min_height;
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
        
        // prevent page refresh on save - either should do but I'm doing both
        e.preventDefault(e); 
        return false;
    });
});
